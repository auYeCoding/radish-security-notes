import { DARK_CLASS_NAME } from "./dark-class";

/**
 * 打印事件所需的最小接口, `window` 满足它.
 */
export type PrintEventTarget = Pick<
  Window,
  "addEventListener" | "removeEventListener"
>;

/**
 * 让打印总是用浅色外观: 打印开始前去掉根元素的深色类名, 打印结束后还原. 深色主题下文字是
 * 浅色, 直接打印到白纸上看不清.
 * @param root 带深色类名的根元素, 通常是 html.
 * @param target 派发 `beforeprint` 与 `afterprint` 事件的对象, 通常是 window.
 * @returns 取消监听的函数.
 */
export function forceLightThemeWhilePrinting(
  root: Element,
  target: PrintEventTarget,
): () => void {
  let wasDark = false;
  const handleBeforePrint = (): void => {
    wasDark = root.classList.contains(DARK_CLASS_NAME);
    root.classList.remove(DARK_CLASS_NAME);
  };
  const handleAfterPrint = (): void => {
    root.classList.toggle(DARK_CLASS_NAME, wasDark);
  };
  target.addEventListener("beforeprint", handleBeforePrint);
  target.addEventListener("afterprint", handleAfterPrint);
  return () => {
    target.removeEventListener("beforeprint", handleBeforePrint);
    target.removeEventListener("afterprint", handleAfterPrint);
  };
}
