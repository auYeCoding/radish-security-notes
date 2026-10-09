import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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

import { UnlockedWorkspace } from "./unlocked-workspace";

/**
 * 工作文件夹与家庭文件夹.
 */
const FOLDERS: readonly FolderSummary[] = [
  { id: "work", name: "工作" },
  { id: "home", name: "家庭" },
];

/**
 * 论坛与银行在工作文件夹里, 维基没有所属文件夹.
 */
const FILED_ENTRIES: readonly EntryDetail[] = [
  { ...FORUM_ENTRY, folderId: "work" },
  { ...BANK_ENTRY, folderId: "work" },
  WIKI_ENTRY,
];

/**
 * 条目与放置目标重叠时用的矩形.
 */
const OVERLAPPING_RECT = new DOMRect(0, 0, 100, 40);

/**
 * 远离一切的矩形, 与别的元素都不相交.
 */
const FAR_AWAY_RECT = new DOMRect(5000, 5000, 10, 10);

/**
 * 拖拽时要重叠的两个元素: 放置目标行的名称与被拖拽条目的名称.
 */
interface DragLayout {
  /**
   * 放置目标行的名称, 例如 "家庭".
   */
  targetLabel: string;
  /**
   * 被拖拽条目的名称, 例如 "论坛".
   */
  sourceName: string;
}

/**
 * 在当前测试分组中登记钩子: 让每个元素量出一个矩形 (jsdom 没有布局, 元素全是零尺寸), 放置目标行
 * 与被拖拽的条目重叠, 其余元素都远离它们; 测试后恢复原来的测量方法.
 * @returns 设定哪两个元素重叠的方法.
 */
function useDragLayout(): (targetLabel: string, sourceName: string) => void {
  const originalRect = Element.prototype.getBoundingClientRect;
  const layout: DragLayout = { targetLabel: "", sourceName: "" };
  beforeEach(() => {
    Element.prototype.getBoundingClientRect = function getRect(
      this: Element,
    ): DOMRect {
      const text = this.textContent ?? "";
      const isTarget =
        this.tagName === "LI" && text.startsWith(layout.targetLabel);
      const isSource =
        (this.tagName === "BUTTON" || this.tagName === "DIV") &&
        text.startsWith(layout.sourceName);
      return isTarget || isSource ? OVERLAPPING_RECT : FAR_AWAY_RECT;
    };
  });
  afterEach(() => {
    Element.prototype.getBoundingClientRect = originalRect;
  });
  return (targetLabel, sourceName) => {
    layout.targetLabel = targetLabel;
    layout.sourceName = sourceName;
  };
}

/**
 * 在条目环境里渲染解锁后的工作区, 等条目与文件夹读取完成.
 * @param options 条目环境的选项, 默认带两个文件夹与三个条目.
 * @returns 渲染所用的环境.
 */
async function renderWorkspace(
  options: EntryTestEnvironmentOptions = {},
): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    entries: FILED_ENTRIES,
    folders: FOLDERS,
    ...options,
  });
  render(<UnlockedWorkspace />, { wrapper: environment.Providers });
  await waitFor(() => {
    expect(environment.entryStore.getState().loadStatus).toBe("ready");
    expect(environment.folderStore.getState().loadStatus).toBe("ready");
  });
  return environment;
}

/**
 * 按名称与条目数取侧栏的一行入口按钮.
 * @param label 入口名称.
 * @param count 入口里的条目数.
 * @returns 入口按钮元素.
 */
function navButton(label: string, count: number): HTMLElement {
  return screen.getByRole("button", {
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

describe("把条目拖进文件夹", () => {
  const placeLayout = useDragLayout();

  it("放在文件夹上后条目归到该文件夹, 两边的条目数即时更新, 入口不动", async () => {
    const environment = await renderWorkspace();
    placeLayout("家庭", "论坛");

    await dragWithKeyboard("论坛");

    await waitFor(() => {
      expect(environment.folderBridge.assignEntry).toHaveBeenCalledWith(
        "forum",
        "home",
      );
    });
    expect(
      await screen.findByRole("button", { name: /^家庭\s*1$/ }),
    ).toBeDefined();
    expect(navButton("工作", 1)).toBeDefined();
    expect(navButton("全部条目", 3).getAttribute("aria-current")).toBe("true");
    expect(getEntryListItems()).toHaveLength(3);
  });

  it("放在全部条目上不是放入文件夹, 不调用接口, 条目仍在原文件夹里", async () => {
    const environment = await renderWorkspace();
    placeLayout("全部条目", "论坛");

    await dragWithKeyboard("论坛");

    expect(environment.folderBridge.assignEntry).not.toHaveBeenCalled();
    expect(navButton("工作", 2)).toBeDefined();
    expect(navButton("全部条目", 3)).toBeDefined();
  });

  it("条目已在目标文件夹里时不调用接口", async () => {
    const environment = await renderWorkspace();
    placeLayout("工作", "论坛");

    await dragWithKeyboard("论坛");

    expect(environment.folderBridge.assignEntry).not.toHaveBeenCalled();
    expect(navButton("工作", 2)).toBeDefined();
  });
});

describe("拖放时的入口与失败", () => {
  const placeLayout = useDragLayout();

  it("在文件夹入口里把选中的条目拖走, 入口不动, 条目从列表消失并选中相邻条目", async () => {
    const environment = await renderWorkspace();
    const user = userEvent.setup();
    await user.click(navButton("工作", 2));
    await user.click(entryButton("论坛"));
    await screen.findByRole("heading", { name: "论坛" });
    placeLayout("家庭", "论坛");

    await dragWithKeyboard("论坛");

    await waitFor(() => {
      expect(getEntryListItems()).toHaveLength(1);
    });
    expect(navButton("工作", 1).getAttribute("aria-current")).toBe("true");
    expect(await screen.findByRole("heading", { name: "银行" })).toBeDefined();
    expect(environment.folderBridge.assignEntry).toHaveBeenCalledWith(
      "forum",
      "home",
    );
  });

  it("放入失败时条目留在原处", async () => {
    await renderWorkspace({
      folderBridgeOverrides: {
        assignEntry: () =>
          Promise.resolve({ ok: false, reason: "unexpected-error" }),
      },
    });
    placeLayout("家庭", "论坛");

    await dragWithKeyboard("论坛");

    expect(navButton("工作", 2)).toBeDefined();
    expect(navButton("家庭", 0)).toBeDefined();
  });
});
