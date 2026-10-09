import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { EntryDetail } from "@shared/entries/entry-types";
import type { FolderSummary } from "@shared/folders/folder-types";

import {
  BANK_ENTRY,
  FORUM_ENTRY,
  WIKI_ENTRY,
} from "@renderer/testing/entry-fixtures";
import { getEntryListItems } from "@renderer/testing/entry-list-queries";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
  type EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import {
  autoBackupStatusOverrides,
  FAILED_AUTO_BACKUP_STATUS,
} from "@renderer/testing/fake-auto-backup-status";
import { TEST_TAGS } from "@renderer/testing/tag-fixtures";
import { useDragLayout } from "@renderer/testing/use-drag-layout";

import { UnlockedWorkspace } from "./unlocked-workspace";

/**
 * 公司文件夹与家庭文件夹.
 */
const FOLDERS: readonly FolderSummary[] = [
  { id: "company", name: "公司" },
  { id: "home", name: "家庭" },
];

/**
 * 论坛与银行在公司文件夹里, 论坛带重要与工作标签, 银行带工作标签; 维基没有所属文件夹, 带个人标签.
 */
const ENTRIES: readonly EntryDetail[] = [
  { ...FORUM_ENTRY, folderId: "company", tagIds: ["important", "work-tag"] },
  { ...BANK_ENTRY, folderId: "company", tagIds: ["work-tag"] },
  { ...WIKI_ENTRY, tagIds: ["personal-tag"] },
];

/**
 * 渲染工作区所用的选项.
 */
interface RenderWorkspaceOptions {
  /**
   * 偏好里侧栏一开始是否已折叠, 默认展开.
   */
  readonly isCollapsed?: boolean;
  /**
   * 条目环境的其余选项, 例如覆盖假邮箱备份桥.
   */
  readonly environmentOptions?: EntryTestEnvironmentOptions;
}

/**
 * 在条目环境里渲染解锁后的工作区, 等条目, 文件夹与标签读取完成.
 * @param options 侧栏初始折叠状态与条目环境的其余选项.
 * @returns 渲染所用的环境.
 */
async function renderWorkspace(
  options: RenderWorkspaceOptions = {},
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    entries: ENTRIES,
    folders: FOLDERS,
    tags: TEST_TAGS,
    ...options.environmentOptions,
  });
  if (options.isCollapsed === true) {
    await environment.store.getState().setSidebarCollapsed(true);
  }
  render(<UnlockedWorkspace />, { wrapper: environment.Providers });
  await waitFor(() => {
    expect(environment.entryStore.getState().loadStatus).toBe("ready");
    expect(environment.folderStore.getState().loadStatus).toBe("ready");
    expect(environment.tagStore.getState().loadStatus).toBe("ready");
  });
  return environment;
}

/**
 * 取侧栏.
 * @returns 侧栏元素.
 */
function getSidebar(): HTMLElement {
  return screen.getByRole("complementary");
}

/**
 * 按名称与条目数取侧栏的一行入口按钮, 折叠与展开时名称都形如 "工作 2".
 * @param label 入口名称.
 * @param count 入口里的条目数.
 * @returns 入口按钮元素.
 */
function navButton(label: string, count: number): HTMLElement {
  return within(getSidebar()).getByRole("button", {
    name: new RegExp(`^${label}\\s*${count}$`),
  });
}

/**
 * 取列表窗格里名称以某段文字开头的条目按钮.
 * @param name 条目名称.
 * @returns 条目按钮元素.
 */
function entryButton(name: string): HTMLElement {
  const item = getEntryListItems().find((candidate) =>
    candidate.textContent?.startsWith(name),
  );
  return within(item as HTMLElement).getByRole("button");
}

/**
 * 用键盘把条目拖到与它重叠的放置目标上放下: 聚焦条目, 按 M 拿起, 按回车放下.
 * @param name 条目名称.
 */
async function dragWithKeyboard(name: string): Promise<void> {
  const user = userEvent.setup();
  entryButton(name).focus();
  await user.keyboard("m");
  await user.keyboard("{Enter}");
}

describe("折叠与展开侧栏", () => {
  it("点切换按钮折叠, 侧栏换成折叠宽度, 再点展开恢复原宽度", async () => {
    await renderWorkspace();
    const user = userEvent.setup();
    expect(getSidebar().dataset.state).toBe("expanded");
    expect(getSidebar().classList.contains("w-(--sidebar-width)")).toBe(true);

    await user.click(screen.getByRole("button", { name: "收起侧栏" }));

    expect(getSidebar().dataset.state).toBe("collapsed");
    expect(
      getSidebar().classList.contains("w-(--sidebar-collapsed-width)"),
    ).toBe(true);
    expect(getSidebar().classList.contains("w-(--sidebar-width)")).toBe(false);
    await user.click(screen.getByRole("button", { name: "展开侧栏" }));
    expect(getSidebar().dataset.state).toBe("expanded");
    expect(getSidebar().classList.contains("w-(--sidebar-width)")).toBe(true);
  });

  it("折叠与展开都经偏好桥保存", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "收起侧栏" }));
    await user.click(await screen.findByRole("button", { name: "展开侧栏" }));

    await screen.findByRole("button", { name: "收起侧栏" });
    expect(environment.bridge.setSidebarCollapsed).toHaveBeenNthCalledWith(
      1,
      true,
    );
    expect(environment.bridge.setSidebarCollapsed).toHaveBeenNthCalledWith(
      2,
      false,
    );
  });

  it("偏好里已是折叠时一启动就是折叠态, 条目列表与详情照常显示", async () => {
    await renderWorkspace({ isCollapsed: true });

    expect(getSidebar().dataset.state).toBe("collapsed");
    expect(screen.getByRole("button", { name: "展开侧栏" })).toBeDefined();
    expect(getEntryListItems()).toHaveLength(3);
    expect(screen.getByText("选择一个条目查看详情")).toBeDefined();
  });
});

describe("折叠态的侧栏内容", () => {
  it("全部条目与文件夹行都收起文字, 名称仍带条目数, 没有标签行与未分类入口", async () => {
    await renderWorkspace({ isCollapsed: true });

    const rows = within(getSidebar()).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    rows.forEach((row) => {
      const text = row.querySelector("[data-slot='sidebar-nav-item-text']");
      expect(text?.classList.contains("grow-0")).toBe(true);
      expect(text?.classList.contains("sr-only")).toBe(false);
    });
    ["全部条目 3", "公司 2", "家庭 0"].forEach((name) =>
      expect(
        within(getSidebar()).getByRole("button", {
          name: new RegExp(`^${name.replace(" ", "\\s*")}$`),
        }),
      ).toBeDefined(),
    );
    expect(
      within(getSidebar()).queryByRole("button", { name: /未分类/ }),
    ).toBeNull();
  });

  it("没有分区标题, 新建按钮和行尾更多菜单, 展开后都回来", async () => {
    await renderWorkspace({ isCollapsed: true });
    const sidebar = within(getSidebar());

    expect(sidebar.queryByRole("heading")).toBeNull();
    expect(sidebar.queryByRole("button", { name: "新建文件夹" })).toBeNull();
    expect(
      sidebar.queryAllByRole("button", { name: /的更多操作/ }),
    ).toHaveLength(0);
    expect(sidebar.getAllByRole("separator")).toHaveLength(1);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "展开侧栏" }));

    expect(sidebar.getAllByRole("heading")).toHaveLength(1);
    expect(sidebar.getByRole("button", { name: "新建文件夹" })).toBeDefined();
    expect(
      sidebar.queryAllByRole("button", { name: /的更多操作/ }).length,
    ).toBe(2);
  });
});

describe("折叠态点文件夹筛选", () => {
  it("点文件夹筛选条目, 选中的行保留高亮和选中标记", async () => {
    await renderWorkspace({ isCollapsed: true });
    const user = userEvent.setup();

    await user.click(navButton("公司", 2));

    expect(getEntryListItems()).toHaveLength(2);
    expect(navButton("公司", 2).getAttribute("aria-current")).toBe("true");
    expect(navButton("公司", 2).closest("li")?.classList).toContain("bg-muted");
    expect(navButton("全部条目", 3).getAttribute("aria-current")).toBeNull();
  });

  it("点全部条目回到全部, 再点文件夹只显示其中的条目", async () => {
    await renderWorkspace({ isCollapsed: true });
    const user = userEvent.setup();

    await user.click(navButton("公司", 2));
    expect(getEntryListItems()).toHaveLength(2);
    await user.click(navButton("全部条目", 3));
    expect(getEntryListItems()).toHaveLength(3);
    await user.click(navButton("公司", 2));

    expect(getEntryListItems()).toHaveLength(2);
    expect(navButton("公司", 2).getAttribute("aria-current")).toBe("true");
  });
});

describe("折叠态把条目拖到文件夹图标上", () => {
  const placeLayout = useDragLayout();

  it("放在家庭文件夹图标上后条目归入家庭, 两边的条目数更新", async () => {
    const environment = await renderWorkspace({ isCollapsed: true });
    placeLayout("家庭", "论坛");

    await dragWithKeyboard("论坛");

    await waitFor(() =>
      expect(environment.folderBridge.assignEntry).toHaveBeenCalledWith(
        "forum",
        "home",
      ),
    );
    expect(
      await screen.findByRole("button", { name: /^家庭\s*1$/ }),
    ).toBeDefined();
    expect(navButton("公司", 1)).toBeDefined();
  });

  it("放在全部条目图标上不是放入文件夹, 不调用接口, 条目仍在原文件夹里", async () => {
    const environment = await renderWorkspace({ isCollapsed: true });
    placeLayout("全部条目", "论坛");

    await dragWithKeyboard("论坛");

    expect(environment.folderBridge.assignEntry).not.toHaveBeenCalled();
    expect(navButton("公司", 2)).toBeDefined();
    expect(navButton("全部条目", 3)).toBeDefined();
  });
});

describe("折叠态的设置入口", () => {
  it("设置按钮只剩图标, 点击仍能打开设置对话框", async () => {
    await renderWorkspace({ isCollapsed: true });

    const button = within(getSidebar()).getByRole("button", { name: "设置" });
    await userEvent.setup().click(button);

    expect(button.querySelector("svg")).not.toBeNull();
    expect(await screen.findByRole("dialog", { name: "设置" })).toBeDefined();
  });

  it("最近一次自动备份失败时图标上有状态圆点, 展开后换回文字标记", async () => {
    await renderWorkspace({
      isCollapsed: true,
      environmentOptions: {
        emailBackupBridgeOverrides: autoBackupStatusOverrides([
          FAILED_AUTO_BACKUP_STATUS,
        ]),
      },
    });
    const button = within(getSidebar()).getByRole("button", { name: /设置/ });
    await waitFor(() =>
      expect(button.querySelector("[data-slot='status-dot']")).not.toBeNull(),
    );
    const dot = button.querySelector("[data-slot='status-dot']");
    expect(dot?.classList.contains("opacity-100")).toBe(true);

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "展开侧栏" }));

    expect(dot?.classList.contains("opacity-0")).toBe(true);
    expect(await within(button).findByText("自动备份失败")).toBeDefined();
  });
});
