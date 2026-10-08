/**
 * 打包版不允许的远程调试开关的名称 (不含前缀): Chromium 的调试端口与调试管道. 任何能连上它们的
 * 进程都能读到页面里输入的主密码, 并调用保险库 IPC.
 */
export const REMOTE_DEBUGGING_SWITCHES = [
  "remote-debugging-port",
  "remote-debugging-pipe",
] as const;

/**
 * 因带着远程调试开关而退出时使用的退出码.
 */
export const REMOTE_DEBUGGING_REFUSED_EXIT_CODE = 1;

/**
 * 拒绝远程调试依赖的应用接口, Electron 的 `app` 满足它.
 */
export interface RemoteDebuggingGuardApp {
  /**
   * 应用是否已打包. 开发版需要调试端口, 不受限制.
   */
  readonly isPackaged: boolean;
  /**
   * 进程的命令行, 开关的识别交给 Chromium 自己的解析 (开关前缀与大小写写法都由它处理).
   */
  readonly commandLine: {
    /**
     * 命令行里是否带有某个开关.
     * @param name 开关名称, 不含前缀.
     * @returns 带有该开关时为 true.
     */
    readonly hasSwitch: (name: string) => boolean;
  };
  /**
   * 立即退出应用, 不显示窗口, 不触发退出前事件.
   * @param exitCode 退出码.
   */
  readonly exit: (exitCode?: number) => void;
}

/**
 * 打包版发现命令行里带有远程调试开关就立即退出: 不显示窗口, 不写日志. 开发版不受影响. 要在启动
 * 最早期调用, 早于单实例锁与应用就绪.
 * @param app 应用对象.
 * @returns 已因远程调试开关请求退出时为 true, 调用方不应再启动应用.
 */
export function refuseRemoteDebugging(app: RemoteDebuggingGuardApp): boolean {
  if (!app.isPackaged) {
    return false;
  }
  const isRequested = REMOTE_DEBUGGING_SWITCHES.some((name) =>
    app.commandLine.hasSwitch(name),
  );
  if (isRequested) {
    app.exit(REMOTE_DEBUGGING_REFUSED_EXIT_CODE);
  }
  return isRequested;
}
