import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FAST_STATE_TRANSITION } from "@renderer/components/ui/state-motion";
import { useDragSource } from "@renderer/lib/drag-drop/use-drag-source";
import { FORUM_ENTRY } from "@renderer/testing/entry-fixtures";
import { createEntryTestEnvironment } from "@renderer/testing/entry-test-environment";
import {
  expectMotionClasses,
  expectNoClassContaining,
} from "@renderer/testing/expect-motion-classes";

import { EntryListItem } from "./entry-list-item";

vi.mock("@renderer/lib/drag-drop/use-drag-source", () => ({
  useDragSource: vi.fn(),
}));

/**
 * 不关心回调的占位函数.
 */
const NO_OP = vi.fn();

/**
 * 没有被拖拽时拖拽源钩子的返回值.
 */
const IDLE_DRAG_SOURCE = {
  setNodeRef: NO_OP,
  dragProps: {},
  isDragging: false,
};

/**
 * 正被拖拽时拖拽源钩子的返回值.
 */
const ACTIVE_DRAG_SOURCE = { ...IDLE_DRAG_SOURCE, isDragging: true };

/**
 * 渲染出的条目行里要检查的元素.
 */
interface RenderedItem {
  /**
   * 行容器元素.
   */
  readonly row: HTMLElement;
  /**
   * 行里的列表项按钮.
   */
  readonly button: HTMLElement;
}

/**
 * 渲染一个条目行.
 * @param isSelected 条目是否被选中查看详情.
 * @returns 行元素与行里的按钮.
 */
async function renderItem(isSelected: boolean): Promise<RenderedItem> {
  const environment = await createEntryTestEnvironment({
    entries: [FORUM_ENTRY],
  });
  render(
    <ul>
      <EntryListItem
        entry={FORUM_ENTRY}
        isSelected={isSelected}
        isChecked={false}
        onSelect={NO_OP}
        onToggleChecked={NO_OP}
        onCheckRange={NO_OP}
      />
    </ul>,
    { wrapper: environment.Providers },
  );
  return {
    row: screen.getByRole("listitem"),
    button: screen.getByRole("button"),
  };
}

beforeEach(() => {
  vi.mocked(useDragSource).mockReturnValue(IDLE_DRAG_SOURCE);
});

describe("条目行的状态过渡", () => {
  it("选中行的竖条与底色和快档状态过渡在同一个元素上", async () => {
    const { row } = await renderItem(true);

    expectMotionClasses(row, FAST_STATE_TRANSITION);
    expect(Array.from(row.classList)).toEqual(
      expect.arrayContaining(["border-s-brand", "bg-muted"]),
    );
    expectNoClassContaining(row, ["transition-all", "transition-["]);
  });

  it("未选中行同样带过渡, 没有选中竖条与底色", async () => {
    const { row } = await renderItem(false);

    expectMotionClasses(row, FAST_STATE_TRANSITION);
    expect(row.classList.contains("bg-muted")).toBe(false);
    expect(row.classList.contains("border-s-brand")).toBe(false);
  });

  it("行内按钮继承快档过渡, 悬停与聚焦有过渡", async () => {
    const { button } = await renderItem(false);

    expectMotionClasses(button, FAST_STATE_TRANSITION);
  });

  it("正被拖拽的按钮半透明, 透明度变化走按钮自带的快档过渡", async () => {
    vi.mocked(useDragSource).mockReturnValue(ACTIVE_DRAG_SOURCE);
    const { button } = await renderItem(false);

    expect(button.classList.contains("opacity-50")).toBe(true);
    expectMotionClasses(button, FAST_STATE_TRANSITION);
  });

  it("没有被拖拽的按钮不是半透明", async () => {
    const { button } = await renderItem(false);

    expect(button.classList.contains("opacity-50")).toBe(false);
  });
});
