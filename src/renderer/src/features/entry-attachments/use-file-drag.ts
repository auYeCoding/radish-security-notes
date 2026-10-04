import { useRef, useState, type DragEvent } from "react";

/**
 * 拖动内容里带文件时, `DataTransfer.types` 里的类型名.
 */
const FILES_DRAG_TYPE = "Files";

/**
 * 文件拖放区需要挂到容器上的拖放事件处理函数.
 */
export interface FileDragHandlers {
  /**
   * 拖动进入区域时的处理.
   */
  readonly onDragEnter: (event: DragEvent) => void;
  /**
   * 拖动离开区域时的处理.
   */
  readonly onDragLeave: (event: DragEvent) => void;
  /**
   * 拖动悬在区域上时的处理.
   */
  readonly onDragOver: (event: DragEvent) => void;
  /**
   * 在区域里放下时的处理.
   */
  readonly onDrop: (event: DragEvent) => void;
}

/**
 * 文件拖放区的状态与事件处理函数.
 */
export interface FileDrag {
  /**
   * 是否有带文件的拖动正悬在区域上.
   */
  readonly isDragging: boolean;
  /**
   * 要挂到容器上的事件处理函数.
   */
  readonly handlers: FileDragHandlers;
}

/**
 * 判断一次拖动是否带着文件.
 * @param event 拖放事件.
 * @returns 带文件时为 true.
 */
function isCarryingFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes(FILES_DRAG_TYPE);
}

/**
 * 跟踪文件拖放: 记录是否有带文件的拖动悬在区域上, 并在放下时把文件交给回调. 嵌套的子元素会让进入与
 * 离开事件成对重复触发, 所以用计数判断是否真的离开了区域. 只处理带文件的拖动, 其它拖动不受影响.
 * @param isDisabled 是否暂不接受拖入, 暂不接受时光标显示禁止, 放下也不回调.
 * @param onDropFiles 放下文件时的回调, 文件不为空才会调用.
 * @returns 拖放状态与事件处理函数.
 */
export function useFileDrag(
  isDisabled: boolean,
  onDropFiles: (files: readonly File[]) => void,
): FileDrag {
  const [isDragging, setIsDragging] = useState(false);
  const depth = useRef(0);
  const handlers: FileDragHandlers = {
    onDragEnter: (event) => {
      if (isCarryingFiles(event)) {
        depth.current += 1;
        setIsDragging(true);
      }
    },
    onDragLeave: (event) => {
      if (isCarryingFiles(event)) {
        depth.current = Math.max(0, depth.current - 1);
        setIsDragging(depth.current > 0);
      }
    },
    onDragOver: (event) => {
      if (isCarryingFiles(event)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = isDisabled ? "none" : "copy";
      }
    },
    onDrop: (event) => {
      if (!isCarryingFiles(event)) {
        return;
      }
      event.preventDefault();
      depth.current = 0;
      setIsDragging(false);
      const files = Array.from(event.dataTransfer.files);
      if (!isDisabled && files.length > 0) {
        onDropFiles(files);
      }
    },
  };
  return { isDragging, handlers };
}
