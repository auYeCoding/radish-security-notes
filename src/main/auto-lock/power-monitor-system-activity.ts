import { attemptSilently } from "../vault/attempt-silently";
import type { SystemActivityPort } from "./system-activity-port";

/**
 * 适配器依赖的系统电源监视接口, Electron 的 `powerMonitor` 满足它.
 */
export interface PowerMonitorPort {
  /**
   * 读取整个会话的键盘鼠标已空闲多少秒.
   * @returns 空闲的秒数.
   */
  getSystemIdleTime(): number;
  /**
   * 订阅系统锁屏.
   * @param event 事件名.
   * @param listener 事件发生时的处理函数.
   * @returns 实现自己决定的返回值.
   */
  on(event: "lock-screen", listener: () => void): unknown;
  /**
   * 订阅系统休眠.
   * @param event 事件名.
   * @param listener 事件发生时的处理函数.
   * @returns 实现自己决定的返回值.
   */
  on(event: "suspend", listener: () => void): unknown;
  /**
   * 取消订阅系统锁屏.
   * @param event 事件名.
   * @param listener 订阅时传入的同一个处理函数.
   * @returns 实现自己决定的返回值.
   */
  removeListener(event: "lock-screen", listener: () => void): unknown;
  /**
   * 取消订阅系统休眠.
   * @param event 事件名.
   * @param listener 订阅时传入的同一个处理函数.
   * @returns 实现自己决定的返回值.
   */
  removeListener(event: "suspend", listener: () => void): unknown;
}

/**
 * 什么也不做的取消订阅函数, 订阅失败时返回它.
 * @returns 没有返回值.
 */
const NO_UNSUBSCRIBE = (): void => undefined;

/**
 * 订阅一个事件, 订阅或取消订阅抛错都被吞掉, 不写日志. 订阅失败相当于没有这个触发.
 * @param subscribe 订阅动作.
 * @param unsubscribe 取消订阅动作.
 * @returns 取消订阅的函数.
 */
function subscribeSilently(
  subscribe: () => unknown,
  unsubscribe: () => unknown,
): () => void {
  if (!attemptSilently(() => void subscribe())) {
    return NO_UNSUBSCRIBE;
  }
  return () => {
    attemptSilently(() => void unsubscribe());
  };
}

/**
 * 读取系统空闲秒数, 抛错或读到不合法的数时按 0 处理, 即当作刚有过操作.
 * @param monitor 系统电源监视接口.
 * @returns 空闲的秒数.
 */
function readIdleSeconds(monitor: PowerMonitorPort): number {
  try {
    const seconds = monitor.getSystemIdleTime();
    return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  } catch {
    return 0;
  }
}

/**
 * 用 Electron 的系统电源监视创建系统活动端口. 空闲时间由系统计算 (Windows 下取自最后一次输入的
 * 时刻), 不依赖应用内计时器的连续性, 休眠恢复后读到的仍是真实的空闲.
 * @param monitor 系统电源监视接口.
 * @returns 系统活动端口.
 */
export function createPowerMonitorActivity(
  monitor: PowerMonitorPort,
): SystemActivityPort {
  return {
    getIdleSeconds: () => readIdleSeconds(monitor),
    onScreenLock: (listener) =>
      subscribeSilently(
        () => monitor.on("lock-screen", listener),
        () => monitor.removeListener("lock-screen", listener),
      ),
    onSuspend: (listener) =>
      subscribeSilently(
        () => monitor.on("suspend", listener),
        () => monitor.removeListener("suspend", listener),
      ),
  };
}
