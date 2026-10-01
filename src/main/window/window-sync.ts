/**
 * 窗口同步依赖的窗口接口, Electron 的 `BrowserWindow` 满足它.
 */
export interface SyncableWindow {
  /**
   * 设置窗口标题.
   * @param title 新标题.
   */
  setTitle: (title: string) => void;
  /**
   * 设置窗口背景色.
   * @param backgroundColor 十六进制颜色字面量.
   */
  setBackgroundColor: (backgroundColor: string) => void;
}

/**
 * 把标题同步到全部窗口.
 * @param windows 要同步的窗口.
 * @param title 新标题.
 */
export function applyWindowTitle(
  windows: readonly SyncableWindow[],
  title: string,
): void {
  windows.forEach((window) => window.setTitle(title));
}

/**
 * 把背景色同步到全部窗口.
 * @param windows 要同步的窗口.
 * @param backgroundColor 十六进制颜色字面量.
 */
export function applyWindowBackground(
  windows: readonly SyncableWindow[],
  backgroundColor: string,
): void {
  windows.forEach((window) => window.setBackgroundColor(backgroundColor));
}
