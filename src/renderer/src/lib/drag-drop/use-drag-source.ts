import { useDraggable } from "@dnd-kit/core";

/**
 * 拖拽源需要接到元素上的东西.
 */
export interface DragSource {
  /**
   * 挂到可拖拽元素的 ref, 让拖放根找到它.
   */
  readonly setNodeRef: (node: HTMLElement | null) => void;
  /**
   * 展开到可拖拽元素上的属性: 无障碍属性与鼠标, 键盘的事件监听.
   */
  readonly dragProps: Record<string, unknown>;
  /**
   * 元素当前是否正被拖拽.
   */
  readonly isDragging: boolean;
}

/**
 * 把一个元素变成拖拽源. 必须在拖放根里使用.
 * @param sourceId 拖拽源编号, 放下时回调里就是它.
 * @param roleDescription 读屏软件读出的元素角色描述, 例如 "可拖动的条目".
 * @returns 要接到元素上的 ref, 属性与拖拽状态.
 */
export function useDragSource(
  sourceId: string,
  roleDescription: string,
): DragSource {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: sourceId,
    attributes: { roleDescription },
  });
  return { setNodeRef, dragProps: { ...attributes, ...listeners }, isDragging };
}
