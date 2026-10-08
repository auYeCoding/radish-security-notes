import type { MainWindowHolder } from "./main-window-holder";

/**
 * 被唤起的主窗口需要提供的方法, Electron 的 `BrowserWindow` 满足它.
 */
export interface ActivatableWindow {
  /**
   * 窗口是否已经销毁.
   * @returns 已销毁时为 true.
   */
  readonly isDestroyed: () => boolean;
  /**
   * 窗口是否处于最小化.
   * @returns 最小化时为 true.
   */
  readonly isMinimized: () => boolean;
  /**
   * 把最小化的窗口还原.
   */
  readonly restore: () => void;
  /**
   * 让窗口获得焦点.
   */
  readonly focus: () => void;
}

/**
 * 监听第二个实例启动所依赖的应用接口, Electron 的 `app` 满足它.
 */
export interface SecondInstanceAppPort {
  /**
   * 监听第二个实例启动.
   * @param event 事件名.
   * @param listener 收到事件时的处理函数.
   * @returns 实现自己决定的返回值.
   */
  readonly on: (event: "second-instance", listener: () => void) => unknown;
}

/**
 * 唤起主窗口: 最小化的先还原, 再让它获得焦点. 窗口还没有建好或已经销毁时什么都不做. 只动窗口,
 * 不涉及保险库, 所以保险库未解锁时只是唤起窗口, 解锁状态不变.
 * @param window 主窗口, 还没有登记时为 undefined.
 */
function activateMainWindow(window: ActivatableWindow | undefined): void {
  if (window === undefined || window.isDestroyed()) {
    return;
  }
  if (window.isMinimized()) {
    window.restore();
  }
  window.focus();
}

/**
 * 第二个实例启动时唤起已有的主窗口. 第二个实例拿不到单实例锁会自己退出, 主实例收到这个事件后把
 * 窗口带到前面, 用户看到的是原来的窗口而不是第二个窗口.
 * @param app 应用对象.
 * @param mainWindowHolder 主窗口持有者, 只读取当前的主窗口.
 */
export function watchSecondInstance(
  app: SecondInstanceAppPort,
  mainWindowHolder: Pick<MainWindowHolder<ActivatableWindow>, "get">,
): void {
  app.on("second-instance", () => activateMainWindow(mainWindowHolder.get()));
}
