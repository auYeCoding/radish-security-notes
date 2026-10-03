import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DragDropProvider,
  type DragDropAnnouncements,
} from "./drag-drop-provider";
import { useDragSource } from "./use-drag-source";
import { useDropTarget } from "./use-drop-target";

/**
 * 测试用的拖拽源编号.
 */
const SOURCE_ID = "source-1";

/**
 * 测试用的放置目标编号.
 */
const TARGET_ID = "target-1";

/**
 * 测试用的读屏播报: 文字里带着编号, 便于断言.
 */
const ANNOUNCEMENTS: DragDropAnnouncements = {
  pickedUp: (sourceId) => `picked ${sourceId}`,
  movedOver: (sourceId, targetId) => `over ${sourceId} ${targetId ?? "none"}`,
  dropped: (sourceId, targetId) => `dropped ${sourceId} ${targetId ?? "none"}`,
  cancelled: (sourceId) => `cancelled ${sourceId}`,
};

/**
 * 一个拖拽源, 带按钮角色并可聚焦.
 * @returns 拖拽源元素.
 */
function Source(): React.JSX.Element {
  const { setNodeRef, dragProps, isDragging } = useDragSource(
    SOURCE_ID,
    "draggable thing",
  );
  return (
    <div ref={setNodeRef} role="button" tabIndex={0} {...dragProps}>
      {isDragging ? "dragging" : "source"}
    </div>
  );
}

/**
 * 一个放置目标行.
 * @returns 放置目标元素.
 */
function Target(): React.JSX.Element {
  const { setNodeRef, isOver } = useDropTarget(TARGET_ID, false);
  return <div ref={setNodeRef}>{isOver ? "over" : "target"}</div>;
}

/**
 * 渲染拖放根, 里面是一个拖拽源与可选的一个放置目标.
 * @param onDrop 放下时的回调.
 * @param hasTarget 是否渲染放置目标, 默认渲染.
 */
function renderProvider(
  onDrop: (sourceId: string, targetId: string) => void,
  hasTarget = true,
): void {
  render(
    <DragDropProvider
      announcements={ANNOUNCEMENTS}
      instructions="press M"
      renderPreview={(sourceId) => <span>preview {sourceId}</span>}
      onDrop={onDrop}
    >
      <Source />
      {hasTarget ? <Target /> : null}
    </DragDropProvider>,
  );
}

/**
 * 在当前测试分组中登记钩子: 让每个元素量出同一个矩形 (jsdom 没有布局, 元素全是零尺寸), 于是拖拽源
 * 一拿起就与放置目标重叠; 测试后恢复原来的测量方法.
 */
function useOverlappingRects(): void {
  const originalRect = Element.prototype.getBoundingClientRect;
  beforeEach(() => {
    Element.prototype.getBoundingClientRect = function getRect(): DOMRect {
      return new DOMRect(0, 0, 100, 40);
    };
  });
  afterEach(() => {
    Element.prototype.getBoundingClientRect = originalRect;
  });
}

describe("DragDropProvider 拖拽源", () => {
  useOverlappingRects();

  it("带上读屏的角色描述与操作说明", () => {
    renderProvider(vi.fn());

    const source = screen.getByRole("button", { name: "source" });

    expect(source.getAttribute("aria-roledescription")).toBe("draggable thing");
    expect(
      document.getElementById(source.getAttribute("aria-describedby") ?? "")
        ?.textContent,
    ).toBe("press M");
  });

  it("单击不触发拖拽与放下回调", async () => {
    const onDrop = vi.fn();
    renderProvider(onDrop);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "source" }));

    expect(screen.queryByText(`picked ${SOURCE_ID}`)).toBeNull();
    expect(onDrop).not.toHaveBeenCalled();
  });
});

describe("DragDropProvider 键盘拖拽", () => {
  useOverlappingRects();

  it("按 M 拿起并播报, 按 Esc 取消并播报, 不触发放下回调", async () => {
    const onDrop = vi.fn();
    renderProvider(onDrop, false);
    const user = userEvent.setup();

    screen.getByRole("button", { name: "source" }).focus();
    await user.keyboard("m");
    expect(await screen.findByText(`picked ${SOURCE_ID}`)).toBeDefined();
    expect(screen.getByText(`preview ${SOURCE_ID}`)).toBeDefined();
    await user.keyboard("{Escape}");

    expect(await screen.findByText(`cancelled ${SOURCE_ID}`)).toBeDefined();
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("拿起后悬在放置目标上, 按回车放下, 回调拿到拖拽源与目标编号", async () => {
    const onDrop = vi.fn();
    renderProvider(onDrop);
    const user = userEvent.setup();

    screen.getByRole("button", { name: "source" }).focus();
    await user.keyboard("m");
    expect(
      await screen.findByText(`over ${SOURCE_ID} ${TARGET_ID}`),
    ).toBeDefined();
    await user.keyboard("{Enter}");

    expect(
      await screen.findByText(`dropped ${SOURCE_ID} ${TARGET_ID}`),
    ).toBeDefined();
    expect(onDrop).toHaveBeenCalledWith(SOURCE_ID, TARGET_ID);
  });
});
