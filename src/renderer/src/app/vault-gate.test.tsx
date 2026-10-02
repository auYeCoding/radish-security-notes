import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";
import type { VaultStatus } from "@shared/vault/vault-status";

import { VaultGate } from "./vault-gate";

/**
 * 在保险库环境里按给定状态渲染保险库门控.
 * @param status 保险库的初始状态.
 * @returns 渲染所用的环境.
 */
async function renderGate(status: VaultStatus): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({ status });
  render(<VaultGate />, { wrapper: environment.Providers });
  return environment;
}

describe("VaultGate 按状态选页", () => {
  it("needs-setup 显示引导页, 不渲染三栏主界面", async () => {
    await renderGate("needs-setup");

    expect(screen.getByRole("heading", { name: "设置主密码" })).toBeDefined();
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("locked 显示解锁页, 不渲染三栏主界面", async () => {
    await renderGate("locked");

    expect(screen.getByRole("heading", { name: "解锁" })).toBeDefined();
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("failed 显示失败页, 不渲染三栏主界面", async () => {
    await renderGate("failed");

    expect(screen.getByRole("heading", { name: "无法打开数据" })).toBeDefined();
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("unlocked 直接渲染三栏主界面", async () => {
    await renderGate("unlocked");

    expect(screen.getByRole("searchbox", { name: "搜索" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "解锁" })).toBeNull();
  });
});

describe("VaultGate 恢复词页与恢复页", () => {
  it("设置成功后先显示恢复词页, 确认之前不渲染三栏主界面", async () => {
    const environment = await renderGate("needs-setup");

    await environment.vaultStore
      .getState()
      .setupWithMasterPassword("password-1");

    expect(
      await screen.findByRole("heading", { name: "保存你的恢复词" }),
    ).toBeDefined();
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.queryByRole("heading", { name: "设置主密码" })).toBeNull();
  });

  it("已解锁但还有待确认的恢复词时仍显示恢复词页", async () => {
    const environment = await renderGate("unlocked");

    await environment.vaultStore.getState().setupWithoutMasterPassword();

    expect(
      await screen.findByRole("heading", { name: "保存你的恢复词" }),
    ).toBeDefined();
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("恢复词确认之后进入三栏主界面", async () => {
    const environment = await renderGate("needs-setup");
    await environment.vaultStore.getState().setupWithMasterPassword("p");
    await screen.findByRole("heading", { name: "保存你的恢复词" });

    act(() => environment.vaultStore.getState().confirmRecoveryWords());

    expect(
      await screen.findByRole("searchbox", { name: "搜索" }),
    ).toBeDefined();
  });
});

describe("VaultGate 恢复页的进入与退出", () => {
  it("locked 时请求恢复显示恢复页, 取消后回到解锁页", async () => {
    const environment = await renderGate("locked");

    act(() => environment.vaultStore.getState().requestRestore());
    expect(
      await screen.findByRole("heading", { name: "用恢复词恢复" }),
    ).toBeDefined();
    act(() => environment.vaultStore.getState().cancelRestore());

    expect(await screen.findByRole("heading", { name: "解锁" })).toBeDefined();
  });

  it("failed 时请求恢复显示恢复页, 取消后回到失败页", async () => {
    const environment = await renderGate("failed");

    act(() => environment.vaultStore.getState().requestRestore());
    expect(
      await screen.findByRole("heading", { name: "用恢复词恢复" }),
    ).toBeDefined();
    act(() => environment.vaultStore.getState().cancelRestore());

    expect(
      await screen.findByRole("heading", { name: "无法打开数据" }),
    ).toBeDefined();
  });

  it("needs-setup 与 unlocked 时请求恢复不改变页面", async () => {
    const environment = await renderGate("needs-setup");

    act(() => environment.vaultStore.getState().requestRestore());

    expect(screen.getByRole("heading", { name: "设置主密码" })).toBeDefined();
  });
});

describe("VaultGate 整屏页面与切换", () => {
  it("整屏页面的右上角有主题与语言切换", async () => {
    await renderGate("locked");

    expect(screen.getByRole("group", { name: "主题" })).toBeDefined();
    expect(screen.getByRole("group", { name: "语言" })).toBeDefined();
  });

  it("在解锁页点击 English 后整屏页面切换成英文", async () => {
    await renderGate("locked");

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "English" }));

    expect(
      await screen.findByRole("heading", { name: "Unlock" }),
    ).toBeDefined();
  });

  it("解锁成功后切换到三栏主界面", async () => {
    await renderGate("locked");
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("主密码"), "correct password");
    await user.click(screen.getByRole("button", { name: "解锁" }));

    await waitFor(() => {
      expect(screen.getByRole("searchbox", { name: "搜索" })).toBeDefined();
    });
    expect(screen.queryByRole("heading", { name: "解锁" })).toBeNull();
  });
});

describe("VaultGate 外框版式", () => {
  it("引导页的外框沿用原有版式, 打印时与屏幕一样", async () => {
    await renderGate("needs-setup");

    const main = screen.getByRole("main");
    expect(main.classList.contains("p-6")).toBe(true);
    expect(main.className).not.toContain("print:");
  });

  it("恢复词页的外框上下留宽并带打印套件", async () => {
    const environment = await renderGate("needs-setup");

    await environment.vaultStore
      .getState()
      .setupWithMasterPassword("password-1");
    await screen.findByRole("heading", { name: "保存你的恢复词" });

    const main = screen.getByRole("main");
    expect(main.classList.contains("py-16")).toBe(true);
    expect(main.classList.contains("print:block")).toBe(true);
  });
});
