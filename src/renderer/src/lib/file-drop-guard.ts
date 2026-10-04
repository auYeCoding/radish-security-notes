/**
 * 拖动内容里带文件时, `DataTransfer.types` 里的类型名.
 */
const FILES_DRAG_TYPE = "Files";

/**
 * 判断一次拖动是否带着文件.
 * @param event 拖放事件.
 * @returns 带文件时为 true.
 */
function isCarryingFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes(FILES_DRAG_TYPE);
}

/**
 * 拖着文件悬在页面上时的处理: 没有被附件区接住 (附件区会自己阻止默认行为) 的拖动在这里被阻止, 并
 * 标明不可放下, 光标显示禁止.
 * @param event 拖放事件.
 */
function refuseFileDrag(event: DragEvent): void {
  if (!isCarryingFiles(event) || event.defaultPrevented) {
    return;
  }
  event.preventDefault();
  if (event.dataTransfer !== null) {
    event.dataTransfer.dropEffect = "none";
  }
}

/**
 * 拖着文件放在页面上时的处理: 没有被附件区接住的放下在这里被阻止.
 * @param event 拖放事件.
 */
function refuseFileDrop(event: DragEvent): void {
  if (isCarryingFiles(event) && !event.defaultPrevented) {
    event.preventDefault();
  }
}

/**
 * 在文档上安装文件拖放守卫. Electron 默认会把页面导航到被放下的文件, 导致整个界面被替换; 守卫让
 * 附件区之外的文件拖放什么都不发生. 附件区先处理并阻止默认行为, 守卫看到已被阻止的事件就不再干预.
 * 只处理带文件的拖动, 页面里条目拖入文件夹等其它拖动不受影响.
 * @param target 要安装守卫的文档.
 * @returns 卸载守卫的函数.
 */
export function installFileDropGuard(target: Document): () => void {
  target.addEventListener("dragover", refuseFileDrag);
  target.addEventListener("drop", refuseFileDrop);
  return () => {
    target.removeEventListener("dragover", refuseFileDrag);
    target.removeEventListener("drop", refuseFileDrop);
  };
}
