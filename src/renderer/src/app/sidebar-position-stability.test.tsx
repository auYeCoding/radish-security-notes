import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { EntryDetail } from "@shared/entries/entry-types";
import type { FolderSummary } from "@shared/folders/folder-types";

import { BANK_ENTRY, FORUM_ENTRY } from "@renderer/testing/entry-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironmentOptions,
} from "@renderer/testing/entry-test-environment";
import { TEST_TAGS } from "@renderer/testing/tag-fixtures";

import { UnlockedWorkspace } from "./unlocked-workspace";

/**
 * 随折叠收起或放出的尺寸类名片段: 分区标题块, 分隔线块与空状态说明块都不应带.
 */
const COLLAPSING_SIZE_FRAGMENTS: readonly string[] = ["h-0", "h-auto"];

/**
 * 侧栏里的一个文件夹.
 */
const FOLDERS: readonly FolderSummary[] = [{ id: "company", name: "公司" }];

/**
 * 一个在公司文件夹里并带标签的条目, 与一个没有文件夹的条目.
 */
const ENTRIES: readonly EntryDetail[] = [
  { ...FORUM_ENTRY, folderId: "company", tagIds: ["important"] },
  { ...BANK_ENTRY },
];

/**
 * 在条目环境里渲染解锁后的工作区, 等条目, 文件夹与标签读取完成.
 * @param options 条目环境的选项, 覆盖默认的文件夹与标签.
 */
async function renderWorkspace(
  options: EntryTestEnvironmentOptions = {},
): Promise<void> {
  const environment = await createEntryTestEnvironment({
    entries: ENTRIES,
    folders: FOLDERS,
    tags: TEST_TAGS,
    ...options,
  });
  render(<UnlockedWorkspace />, { wrapper: environment.Providers });
  await waitFor(() => {
    expect(environment.entryStore.getState().loadStatus).toBe("ready");
    expect(environment.folderStore.getState().loadStatus).toBe("ready");
    expect(environment.tagStore.getState().loadStatus).toBe("ready");
  });
}

/**
 * 取侧栏.
 * @returns 侧栏元素.
 */
function getSidebar(): HTMLElement {
  return screen.getByRole("complementary");
}

/**
 * 取出侧栏里影响纵向位置的块的类名: 分区标题块, 分隔线块, 空状态说明块, 以及标题块所在的叠放容器.
 * 行尾操作的盒子在行内, 沿宽度收放, 不影响纵向位置, 不在其中.
 * @returns 每个块的类名文本, 叠放容器的类名排在它的块之后.
 */
function readVerticalLayoutClasses(): string[] {
  const boxes = Array.from(
    getSidebar().querySelectorAll("[data-slot='collapsible-box']"),
  ).filter((box) => box.closest("li") === null);
  const stacks = new Set(
    boxes
      .map((box) => box.parentElement)
      .filter((parent) => parent?.classList.contains("grid")),
  );
  return [
    ...boxes.map((box) => Array.from(box.classList).join(" ")),
    ...Array.from(stacks, (stack) =>
      Array.from(stack?.classList ?? []).join(" "),
    ),
  ];
}

/**
 * 读出侧栏里每一行入口按钮的高度类名.
 * @returns 每行按钮的高度类名, 取不到时为空串.
 */
function readRowHeightClasses(): string[] {
  return within(getSidebar())
    .getAllByRole("listitem")
    .map(
      (row) =>
        Array.from(row.querySelector("button")?.classList ?? []).find(
          (className) => className.startsWith("h-"),
        ) ?? "",
    );
}

/**
 * 点切换按钮折叠侧栏.
 */
async function collapseSidebar(): Promise<void> {
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "收起侧栏" }));
}

describe("侧栏收缩与展开时分区的纵向位置不变", () => {
  it("有文件夹时, 分区标题块的占位类名在两种状态下完全一致, 都不收起高度", async () => {
    await renderWorkspace();
    const expanded = readVerticalLayoutClasses();

    await collapseSidebar();
    const collapsed = readVerticalLayoutClasses();

    expect(getSidebar().dataset.state).toBe("collapsed");
    expect(expanded).toHaveLength(3);
    expect(collapsed).toEqual(expanded);
    COLLAPSING_SIZE_FRAGMENTS.forEach((fragment) =>
      expect(expanded.join(" ").split(" ")).not.toContain(fragment),
    );
  });

  it("没有文件夹时, 空状态说明块也保持占位, 与标题块一起在两种状态下类名一致", async () => {
    await renderWorkspace({ folders: [] });
    const expanded = readVerticalLayoutClasses();

    await collapseSidebar();
    const collapsed = readVerticalLayoutClasses();

    expect(expanded).toHaveLength(4);
    expect(collapsed).toEqual(expanded);
    COLLAPSING_SIZE_FRAGMENTS.forEach((fragment) =>
      expect(expanded.join(" ").split(" ")).not.toContain(fragment),
    );
    expect(within(getSidebar()).getByText("还没有文件夹")).toBeDefined();
  });

  it("每一行入口按钮的高度类名在两种状态下一致", async () => {
    await renderWorkspace();
    const expanded = readRowHeightClasses();

    await collapseSidebar();

    expect(expanded.every((className) => className !== "")).toBe(true);
    expect(readRowHeightClasses()).toEqual(expanded);
  });
});

describe("侧栏空状态不带占位图标", () => {
  it("没有文件夹时, 无论折叠与否, 空状态位置都没有文件夹占位图标, 也没有标签的说明", async () => {
    await renderWorkspace({ folders: [], tags: [] });

    expect(getSidebar().querySelector(".lucide-folder")).toBeNull();
    await collapseSidebar();

    expect(getSidebar().querySelector(".lucide-folder")).toBeNull();
    expect(within(getSidebar()).getByText("还没有文件夹")).toBeDefined();
    expect(within(getSidebar()).queryByText("还没有标签")).toBeNull();
  });
});
