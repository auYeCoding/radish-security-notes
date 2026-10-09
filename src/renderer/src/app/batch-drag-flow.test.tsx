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
} from "@renderer/testing/entry-test-environment";
import { checkedIdsOf, checkRows } from "@renderer/testing/batch-test-helpers";

import { UnlockedWorkspace } from "./unlocked-workspace";

/**
 * 办公文件夹与家庭文件夹.
 */
const FOLDERS: readonly FolderSummary[] = [
  { id: "office", name: "办公" },
  { id: "home", name: "家庭" },
];

/**
 * 论坛与银行在办公文件夹里, 维基没有所属文件夹.
 */
const ENTRIES: readonly EntryDetail[] = [
  { ...FORUM_ENTRY, folderId: "office" },
  { ...BANK_ENTRY, folderId: "office" },
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
 * 拖拽时要重叠的元素: 放置目标行的名称, 与被拖拽对象 (条目名称或整批的预览文字) 的开头.
 */
interface DragLayout {
  /**
   * 放置目标行的名称, 例如 "家庭".
   */
  targetLabel: string;
  /**
   * 被拖拽对象文字的开头, 单个条目是名称, 整批是预览文字.
   */
  sourcePrefixes: readonly string[];
}

/**
 * 在当前测试分组中登记钩子: 让每个元素量出一个矩形 (jsdom 没有布局, 元素全是零尺寸), 放置目标行
 * 与被拖拽的对象重叠, 其余元素都远离它们; 测试后恢复原来的测量方法.
 * @returns 设定哪些元素重叠的方法.
 */
function useDragLayout(): (
  targetLabel: string,
  sourcePrefixes: readonly string[],
) => void {
  const originalRect = Element.prototype.getBoundingClientRect;
  const layout: DragLayout = { targetLabel: "", sourcePrefixes: [] };
  beforeEach(() => {
    Element.prototype.getBoundingClientRect = function getRect(
      this: Element,
    ): DOMRect {
      const text = this.textContent ?? "";
      const isTarget =
        this.tagName === "LI" && text.startsWith(layout.targetLabel);
      const isSource =
        (this.tagName === "BUTTON" || this.tagName === "DIV") &&
        layout.sourcePrefixes.some((prefix) => text.startsWith(prefix));
      return isTarget || isSource ? OVERLAPPING_RECT : FAR_AWAY_RECT;
    };
  });
  afterEach(() => {
    Element.prototype.getBoundingClientRect = originalRect;
  });
  return (targetLabel, sourcePrefixes) => {
    layout.targetLabel = targetLabel;
    layout.sourcePrefixes = sourcePrefixes;
  };
}

/**
 * 在条目环境里渲染解锁后的工作区, 等条目与文件夹读取完成.
 * @returns 渲染所用的环境.
 */
async function renderWorkspace(): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    entries: ENTRIES,
    folders: FOLDERS,
  });
  render(<UnlockedWorkspace />, { wrapper: environment.Providers });
  await waitFor(() => {
    expect(environment.entryStore.getState().loadStatus).toBe("ready");
    expect(environment.folderStore.getState().loadStatus).toBe("ready");
  });
  return environment;
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

describe("拖拽整批已勾选的条目", () => {
  const placeLayout = useDragLayout();

  it("拖一个已勾选的条目放在文件夹上, 整批勾选的条目一次移进去, 勾选清空", async () => {
    const environment = await renderWorkspace();
    await checkRows(userEvent.setup(), ["论坛", "维基"]);
    placeLayout("家庭", ["论坛", "2 个条目"]);

    await dragWithKeyboard("论坛");

    await waitFor(() => {
      expect(environment.batchBridge.moveEntries).toHaveBeenCalledWith(
        ["forum", "wiki"],
        "home",
      );
    });
    expect(
      await screen.findByRole("button", { name: /^家庭\s*2$/ }),
    ).toBeDefined();
    expect(checkedIdsOf(environment)).toEqual([]);
    expect(environment.folderBridge.assignEntry).not.toHaveBeenCalled();
  });

  it("整批里已在目标文件夹的条目不再移动", async () => {
    const environment = await renderWorkspace();
    await checkRows(userEvent.setup(), ["论坛", "维基"]);
    placeLayout("办公", ["论坛", "2 个条目"]);

    await dragWithKeyboard("论坛");

    await waitFor(() => {
      expect(environment.batchBridge.moveEntries).toHaveBeenCalledWith(
        ["wiki"],
        "office",
      );
    });
  });

  it("拖一个没勾选的条目仍只移动它自己, 勾选保持不变", async () => {
    const environment = await renderWorkspace();
    await checkRows(userEvent.setup(), ["银行"]);
    placeLayout("家庭", ["论坛"]);

    await dragWithKeyboard("论坛");

    await waitFor(() => {
      expect(environment.folderBridge.assignEntry).toHaveBeenCalledWith(
        "forum",
        "home",
      );
    });
    expect(environment.batchBridge.moveEntries).not.toHaveBeenCalled();
    expect(checkedIdsOf(environment)).toEqual(["bank"]);
  });
});

describe("拖拽整批条目的失败与读屏播报", () => {
  const placeLayout = useDragLayout();

  it("整批移入失败时条目与勾选都留在原处", async () => {
    const environment = await renderWorkspace();
    environment.batchBridge.moveEntries = () =>
      Promise.resolve({ ok: false, reason: "unexpected-error" });
    await checkRows(userEvent.setup(), ["论坛", "维基"]);
    placeLayout("家庭", ["论坛", "2 个条目"]);

    await dragWithKeyboard("论坛");

    expect(
      await screen.findByRole("button", { name: /^办公\s*2$/ }),
    ).toBeDefined();
    expect(checkedIdsOf(environment)).toEqual(["forum", "wiki"]);
  });

  it("拿起整批条目移到文件夹上方时读屏播报写条目数, 预览也写条目数", async () => {
    await renderWorkspace();
    await checkRows(userEvent.setup(), ["论坛", "维基"]);
    placeLayout("家庭", ["论坛", "2 个条目"]);
    const user = userEvent.setup();
    entryButton("论坛").focus();

    await user.keyboard("m");

    await waitFor(() => {
      expect(document.body.textContent).toContain("2 个条目在 家庭 上方.");
    });
    expect(screen.getAllByText("2 个条目").length).toBeGreaterThan(0);
  });
});
