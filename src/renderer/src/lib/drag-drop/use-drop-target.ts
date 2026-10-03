import { useDroppable } from "@dnd-kit/core";

/**
 * 放置目标需要接到元素上的东西.
 */
export interface DropTarget {
  /**
   * 挂到放置目标元素的 ref, 让拖放根找到它.
   */
  readonly setNodeRef: (node: HTMLElement | null) => void;
  /**
   * 拖拽源当前是否正悬在这个目标上.
   */
  readonly isOver: boolean;
}

/**
 * 把一个元素变成放置目标. 必须在拖放根里使用.
 * @param targetId 放置目标编号, 放下时回调里就是它.
 * @param isDisabled 是否不接收放置, 为真时拖拽源不会悬停到它.
 * @returns 要接到元素上的 ref 与悬停状态.
 */
export function useDropTarget(
  targetId: string,
  isDisabled: boolean,
): DropTarget {
  const { setNodeRef, isOver } = useDroppable({
    id: targetId,
    disabled: isDisabled,
  });
  return { setNodeRef, isOver };
}
