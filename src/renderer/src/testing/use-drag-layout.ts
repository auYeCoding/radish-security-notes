import { afterEach, beforeEach } from "vitest";

/**
 * 条目与放置目标重叠时用的矩形.
 */
const OVERLAPPING_RECT = new DOMRect(0, 0, 100, 40);

/**
 * 远离一切的矩形, 与别的元素都不相交.
 */
const FAR_AWAY_RECT = new DOMRect(5000, 5000, 10, 10);

/**
 * 拖拽时要重叠的两个元素: 放置目标行的名称开头与被拖拽条目的名称开头.
 */
interface DragLayout {
  /**
   * 放置目标行的名称开头, 例如 "家庭".
   */
  targetLabel: string;
  /**
   * 被拖拽条目的名称开头, 例如 "论坛".
   */
  sourceName: string;
}

/**
 * 在当前测试分组中登记钩子: jsdom 没有布局, 元素全是零尺寸, 所以让每个元素量出一个矩形, 放置目标行
 * 与被拖拽的条目重叠, 其余元素都远离它们; 测试后恢复原来的测量方法. 只给用键盘做拖放的测试使用.
 * @returns 设定哪两个元素重叠的方法.
 */
export function useDragLayout(): (
  targetLabel: string,
  sourceName: string,
) => void {
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
