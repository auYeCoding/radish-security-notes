import type { AutoLockReason } from "./auto-lock-reason";

/**
 * preload 暴露给渲染进程的保险库事件接口: 保险库状态可能被主进程自己改变 (自动锁定), 渲染进程订阅
 * 这些推送来跟上主进程的状态.
 */
export interface VaultEventsBridge {
  /**
   * 订阅自动锁定: 主进程因空闲, 锁屏或休眠锁定了保险库之后推送一次原因.
   * @param listener 收到推送时调用的函数, 参数是自动锁定的原因.
   * @returns 取消订阅的函数.
   */
  readonly onAutoLocked: (
    listener: (reason: AutoLockReason) => void,
  ) => () => void;
}
