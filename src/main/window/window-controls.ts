/**
 * 窗口控制依赖的窗口接口, Electron 的 `BrowserWindow` 满足它.
 */
export interface ControllableWindow {
  /**
   * 最小化窗口.
   */
  readonly minimize: () => void;
  /**
   * 最大化窗口.
   */
  readonly maximize: () => void;
  /**
   * 从最大化还原窗口.
   */
  readonly unmaximize: () => void;
  /**
   * 读取窗口当前是否最大化.
   * @returns 窗口已最大化时为 true.
   */
  readonly isMaximized: () => boolean;
  /**
   * 关闭窗口.
   */
  readonly close: () => void;
}

/**
 * 最小化窗口.
 * @param window 要操作的窗口.
 */
export function minimizeWindow(window: ControllableWindow): void {
  window.minimize();
}

/**
 * 窗口已最大化时还原, 否则最大化.
 * @param window 要操作的窗口.
 */
export function toggleWindowMaximize(window: ControllableWindow): void {
  if (window.isMaximized()) {
    window.unmaximize();
    return;
  }
  window.maximize();
}

/**
 * 关闭窗口.
 * @param window 要操作的窗口.
 */
export function closeWindow(window: ControllableWindow): void {
  window.close();
}

/**
 * 读取窗口当前是否最大化.
 * @param window 要查询的窗口.
 * @returns 窗口已最大化时为 true.
 */
export function isWindowMaximized(window: ControllableWindow): boolean {
  return window.isMaximized();
}
