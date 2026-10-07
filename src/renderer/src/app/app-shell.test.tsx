import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { createEntryTestEnvironment } from "@renderer/testing/entry-test-environment";

import { AppShell } from "./app-shell";

/**
 * 在条目环境里渲染三栏主界面.
 */
async function renderShell(): Promise<void> {
  const { Providers } = await createEntryTestEnvironment();
  render(<AppShell />, { wrapper: Providers });
}

/**
 * 判断第二个节点在文档里是否位于第一个节点之后.
 * @param first 第一个节点.
 * @param second 第二个节点.
 * @returns 第二个节点在第一个之后时为 true.
 */
function isFollowing(first: Node, second: Node): boolean {
  return Boolean(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
}

describe("AppShell 布局", () => {
  it("显示三栏空壳: 标签与文件夹, 条目列表, 条目详情, 搜索入口与设置按钮, 应用名称在标题栏里而不在三栏界面里", async () => {
    await renderShell();

    expect(screen.queryByText("安全笔记")).toBeNull();
    expect(screen.getByRole("heading", { name: "标签" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "文件夹" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "条目" })).toBeDefined();
    expect(screen.getByText("共 0 个条目")).toBeDefined();
    expect(screen.getByText("选择一个条目查看详情")).toBeDefined();
    expect(screen.getByRole("searchbox", { name: "搜索" })).toBeDefined();
    expect(screen.getByRole("button", { name: "设置" })).toBeDefined();
  });

  it("侧栏里标签在文件夹之上, 且没有主题与语言切换控件", async () => {
    await renderShell();

    const sidebar = within(screen.getByRole("complementary"));
    const tags = sidebar.getByRole("heading", { name: "标签" });
    const folders = sidebar.getByRole("heading", { name: "文件夹" });
    expect(isFollowing(tags, folders)).toBe(true);
    expect(sidebar.queryByRole("group", { name: "主题" })).toBeNull();
    expect(sidebar.queryByRole("group", { name: "语言" })).toBeNull();
  });

  it("顶栏里搜索栏在左, 主题与语言切换控件在右", async () => {
    await renderShell();

    const topbar = within(screen.getByRole("banner"));
    const searchbox = topbar.getByRole("searchbox", { name: "搜索" });
    const themeGroup = topbar.getByRole("group", { name: "主题" });
    const languageGroup = topbar.getByRole("group", { name: "语言" });
    expect(isFollowing(searchbox, themeGroup)).toBe(true);
    expect(isFollowing(themeGroup, languageGroup)).toBe(true);
  });
});

describe("AppShell 设置入口", () => {
  it("侧栏底部只有设置按钮, 导入, 导出, 邮箱备份, 从备份恢复入口不在侧栏", async () => {
    await renderShell();

    const sidebar = within(screen.getByRole("complementary"));
    expect(sidebar.getByRole("button", { name: "设置" })).toBeDefined();
    ["导入数据", "导出数据", "邮箱备份", "从备份恢复"].forEach((name) =>
      expect(sidebar.queryByRole("button", { name })).toBeNull(),
    );
  });

  it("设置对话框里导出入口在导入入口之后, 邮箱备份入口之前", async () => {
    await renderShell();
    await userEvent.setup().click(screen.getByRole("button", { name: "设置" }));

    const dialog = within(await screen.findByRole("dialog", { name: "设置" }));
    const importTrigger = dialog.getByRole("button", { name: "导入数据" });
    const exportTrigger = dialog.getByRole("button", { name: "导出数据" });
    const emailBackup = dialog.getByRole("button", { name: "邮箱备份" });
    expect(isFollowing(importTrigger, exportTrigger)).toBe(true);
    expect(isFollowing(exportTrigger, emailBackup)).toBe(true);
  });

  it("设置对话框里从备份恢复入口在邮箱备份入口之后", async () => {
    await renderShell();
    await userEvent.setup().click(screen.getByRole("button", { name: "设置" }));

    const dialog = within(await screen.findByRole("dialog", { name: "设置" }));
    const emailBackup = dialog.getByRole("button", { name: "邮箱备份" });
    const restore = dialog.getByRole("button", { name: "从备份恢复" });
    expect(isFollowing(emailBackup, restore)).toBe(true);
  });
});

describe("AppShell 语言切换", () => {
  it("切换语言后全部窗格的文案随之切换", async () => {
    await renderShell();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "English" }));

    expect(await screen.findByRole("heading", { name: "Tags" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Folders" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Entries" })).toBeDefined();
    expect(screen.getByText("0 entries")).toBeDefined();
    expect(
      screen.getByText("Select an entry to see its details"),
    ).toBeDefined();
    expect(screen.getByRole("searchbox", { name: "Search" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Settings" })).toBeDefined();
  });
});
