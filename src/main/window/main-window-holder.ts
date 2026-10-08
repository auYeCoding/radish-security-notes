/**
 * 主窗口持有者: 保存当前的主窗口, 全部 IPC 通道的来源校验据此判断调用是否来自主窗口.
 */
export interface MainWindowHolder<WindowType> {
  /**
   * 读取当前的主窗口.
   * @returns 主窗口, 还没有登记时为 undefined.
   */
  readonly get: () => WindowType | undefined;
  /**
   * 登记主窗口, 取代之前登记的窗口.
   * @param window 新的主窗口.
   */
  readonly set: (window: WindowType) => void;
}

/**
 * 创建一个空的主窗口持有者.
 * @returns 主窗口持有者.
 */
export function createMainWindowHolder<
  WindowType,
>(): MainWindowHolder<WindowType> {
  let current: WindowType | undefined;
  return {
    get: () => current,
    set: (window) => {
      current = window;
    },
  };
}
