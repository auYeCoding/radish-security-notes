/**
 * 窗口控制桥: 渲染进程请主进程操作自己所在的主窗口, 并订阅窗口最大化状态的变化. 主进程只接受来自
 * 主窗口顶层页面的调用.
 */
export interface WindowControlsBridge {
  /**
   * 最小化窗口.
   */
  readonly minimize: () => Promise<void>;
  /**
   * 窗口已最大化时还原, 否则最大化.
   */
  readonly toggleMaximize: () => Promise<void>;
  /**
   * 关闭窗口.
   */
  readonly close: () => Promise<void>;
  /**
   * 读取窗口当前是否最大化.
   * @returns 窗口已最大化时为 true.
   */
  readonly isMaximized: () => Promise<boolean>;
  /**
   * 订阅窗口最大化状态的变化.
   * @param listener 状态变化时收到窗口是否最大化.
   * @returns 取消订阅的函数.
   */
  readonly onMaximizedChange: (
    listener: (isMaximized: boolean) => void,
  ) => () => void;
}
