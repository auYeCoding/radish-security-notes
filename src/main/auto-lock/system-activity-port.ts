/**
 * 自动锁定对操作系统活动的需求: 键盘鼠标空闲了多久, 系统何时锁屏, 何时休眠. 测试里换成假的, 控制
 * 模块不认识 Electron.
 */
export interface SystemActivityPort {
  /**
   * 读取整个会话的键盘鼠标已空闲多少秒, 读取失败时按 0 (刚有过操作) 处理.
   * @returns 空闲的秒数.
   */
  readonly getIdleSeconds: () => number;
  /**
   * 订阅系统锁屏.
   * @param listener 锁屏时调用的函数.
   * @returns 取消订阅的函数, 订阅失败时是什么也不做的函数.
   */
  readonly onScreenLock: (listener: () => void) => () => void;
  /**
   * 订阅系统休眠.
   * @param listener 休眠时调用的函数.
   * @returns 取消订阅的函数, 订阅失败时是什么也不做的函数.
   */
  readonly onSuspend: (listener: () => void) => () => void;
}
