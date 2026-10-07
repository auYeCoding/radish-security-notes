import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { App } from "@renderer/app/app";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";
import type { VaultStatus } from "@shared/vault/vault-status";

/**
 * 在条目环境里按给定的保险库状态渲染根组件.
 * @param status 保险库的初始状态.
 * @returns 渲染所用的环境.
 */
async function renderApp(status: VaultStatus): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({ status });
  render(<App />, { wrapper: environment.Providers });
  return environment;
}

/**
 * 取出标题栏元素.
 * @returns 标题栏元素.
 */
function getTitleBar(): HTMLElement {
  return document.querySelector<HTMLElement>("[data-slot='title-bar']")!;
}

/**
 * 取出标题栏下方的内容容器元素.
 * @returns 内容容器元素.
 */
function getWindowContent(): HTMLElement {
  return document.querySelector<HTMLElement>("[data-slot='window-content']")!;
}

/**
 * 断言标题栏完整: 左侧是应用名称, 右侧是三个窗口按钮, 且整个页面只有这一个标题栏.
 */
function expectCompleteTitleBar(): void {
  expect(document.querySelectorAll("[data-slot='title-bar']")).toHaveLength(1);
  const titleBar = within(getTitleBar());
  expect(titleBar.getByText("安全笔记")).toBeDefined();
  const controls = within(titleBar.getByRole("group", { name: "窗口控制" }));
  expect(controls.getByRole("button", { name: "最小化" })).toBeDefined();
  expect(controls.getByRole("button", { name: "最大化" })).toBeDefined();
  expect(controls.getByRole("button", { name: "关闭" })).toBeDefined();
}

describe("App", () => {
  it("在 jsdom 中能渲染且不抛出错误", async () => {
    const { Providers } = await createEntryTestEnvironment();

    expect(() => render(<App />, { wrapper: Providers })).not.toThrow();
  });
});

describe("App 标题栏出现在每个整屏页面", () => {
  it("引导页有标题栏", async () => {
    await renderApp("needs-setup");

    expect(screen.getByRole("heading", { name: "设置主密码" })).toBeDefined();
    expectCompleteTitleBar();
  });

  it("解锁页有标题栏", async () => {
    await renderApp("locked");

    expect(screen.getByRole("heading", { name: "解锁" })).toBeDefined();
    expectCompleteTitleBar();
  });

  it("失败页有标题栏", async () => {
    await renderApp("failed");

    expect(screen.getByRole("heading", { name: "无法打开数据" })).toBeDefined();
    expectCompleteTitleBar();
  });

  it("恢复页有标题栏", async () => {
    const environment = await renderApp("locked");

    act(() => environment.vaultStore.getState().requestRestore());

    expect(
      await screen.findByRole("heading", { name: "用恢复词恢复" }),
    ).toBeDefined();
    expectCompleteTitleBar();
  });

  it("恢复词页有标题栏", async () => {
    const environment = await renderApp("needs-setup");

    await environment.vaultStore
      .getState()
      .setupWithMasterPassword("password-1");

    expect(
      await screen.findByRole("heading", { name: "保存你的恢复词" }),
    ).toBeDefined();
    expectCompleteTitleBar();
  });
});

describe("App 标题栏出现在三栏主界面并跨界面保持", () => {
  it("三栏主界面有标题栏, 应用名称只在标题栏里", async () => {
    await renderApp("unlocked");

    expect(screen.getByRole("searchbox", { name: "搜索" })).toBeDefined();
    expectCompleteTitleBar();
    expect(screen.getAllByText("安全笔记")).toHaveLength(1);
  });

  it("解锁成功切换到三栏主界面时标题栏是同一个元素, 不重建", async () => {
    const environment = await renderApp("locked");
    const titleBarBefore = getTitleBar();

    await act(() =>
      environment.vaultStore.getState().unlock("correct password"),
    );

    expect(
      await screen.findByRole("searchbox", { name: "搜索" }),
    ).toBeDefined();
    expect(getTitleBar()).toBe(titleBarBefore);
  });
});

describe("App 标题栏与页面的布局关系", () => {
  it("整屏页面里标题栏在内容容器之前, 右上角控件在内容容器里而不在标题栏里", async () => {
    await renderApp("locked");

    const titleBar = getTitleBar();
    const content = getWindowContent();
    const themeGroup = screen.getByRole("group", { name: "主题" });
    expect(titleBar.nextElementSibling).toBe(content);
    expect(content.contains(themeGroup)).toBe(true);
    expect(titleBar.contains(themeGroup)).toBe(false);
    expect(content.contains(screen.getByRole("main"))).toBe(true);
  });

  it("三栏主界面里顶栏的主题与语言切换在内容容器里, 不在标题栏里, 且 banner 只有顶栏一个", async () => {
    await renderApp("unlocked");

    const banners = screen.getAllByRole("banner");
    expect(banners).toHaveLength(1);
    expect(getTitleBar().contains(banners[0])).toBe(false);
    expect(getWindowContent().contains(banners[0])).toBe(true);
    expect(getTitleBar().contains(screen.getByRole("searchbox"))).toBe(false);
  });

  it("窗口框架不限制打印: 标题栏隐藏, 框架与内容容器不裁剪", async () => {
    await renderApp("locked");

    const frame = getTitleBar().parentElement!;
    expect(getTitleBar().classList.contains("print:hidden")).toBe(true);
    expect(frame.classList.contains("print:h-auto")).toBe(true);
    expect(frame.classList.contains("print:block")).toBe(true);
    expect(
      getWindowContent().classList.contains("print:overflow-visible"),
    ).toBe(true);
  });
});

describe("App 标题栏随语言与最大化状态变化", () => {
  it("切换成英文后应用名称与窗口按钮名称随之切换", async () => {
    await renderApp("locked");

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "English" }));

    const titleBar = within(getTitleBar());
    expect(await titleBar.findByText("Security Notes")).toBeDefined();
    expect(titleBar.getByRole("button", { name: "Minimize" })).toBeDefined();
    expect(titleBar.getByRole("button", { name: "Maximize" })).toBeDefined();
    expect(titleBar.getByRole("button", { name: "Close" })).toBeDefined();
  });

  it("主进程推送最大化后第二个按钮变为还原", async () => {
    const environment = await renderApp("locked");

    act(() => environment.windowControlsBridge.emitMaximizedChange(true));

    expect(
      within(getTitleBar()).getByRole("button", { name: "还原" }),
    ).toBeDefined();
  });
});
