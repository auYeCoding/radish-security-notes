/**
 * 单实例锁依赖的应用接口, Electron 的 `app` 满足它.
 */
export interface SingleInstanceAppPort {
  /**
   * 请求单实例锁.
   * @returns 本进程成为主实例时为 true, 已有别的实例持有锁时为 false.
   */
  readonly requestSingleInstanceLock: () => boolean;
  /**
   * 请求应用退出.
   */
  readonly quit: () => void;
}

/**
 * 请求单实例锁, 同一时刻只允许一个应用实例: 拿到锁的进程是主实例, 继续启动; 拿不到锁说明已有
 * 实例在运行, 本进程请求退出, 调用方不应再启动应用也不应创建窗口. 要在启动最早期调用.
 * @param app 应用对象.
 * @returns 本进程是主实例时为 true.
 */
export function claimPrimaryInstance(app: SingleInstanceAppPort): boolean {
  const isPrimaryInstance = app.requestSingleInstanceLock();
  if (!isPrimaryInstance) {
    app.quit();
  }
  return isPrimaryInstance;
}
