import type { AutoLockSettings } from "@shared/preferences/auto-lock-settings";
import type { AutoLockReason } from "@shared/vault/auto-lock-reason";

import type { SchedulerClock } from "../email-backup/scheduler-clock";
import {
  attemptAutoLock,
  type AutoLockAttemptOutcome,
  type AutoLockVaultPort,
} from "./auto-lock-attempt";
import { hasIdleReached, isReasonEnabled } from "./auto-lock-rules";
import { AUTO_LOCK_CHECK_INTERVAL_MILLISECONDS } from "./auto-lock-timing";
import type { SystemActivityPort } from "./system-activity-port";

/**
 * 自动锁定控制的依赖.
 */
export interface AutoLockControllerDependencies {
  /**
   * 周期检查用的时钟端口.
   */
  readonly clock: SchedulerClock;
  /**
   * 系统活动端口: 空闲秒数, 锁屏与休眠订阅.
   */
  readonly activity: SystemActivityPort;
  /**
   * 保险库: 是否已解锁, 请求锁定.
   */
  readonly vault: AutoLockVaultPort;
  /**
   * 读取当前的自动锁定设置, 每次检查与每个事件都重新读取, 设置改动立即生效.
   */
  readonly readSettings: () => AutoLockSettings;
  /**
   * 自动锁定成功之后的回调, 参数是锁定原因.
   */
  readonly onLocked: (reason: AutoLockReason) => void;
}

/**
 * 一次待完成的自动锁定.
 */
interface PendingLock {
  /**
   * 触发的原因.
   */
  readonly reason: AutoLockReason;
  /**
   * 此前被进行中任务挡住的次数.
   */
  readonly deferredChecks: number;
}

/**
 * 自动锁定控制: 保险库已解锁期间, 每隔几秒读一次系统空闲, 并订阅系统锁屏与休眠, 到点就调用保险库
 * 服务的锁定入口. 被进行中的任务挡住时每个周期重试, 超过推迟上限后忽略任务强制锁定. 没有设主密码的
 * 保险库不适用, 空闲触发只试一次, 用户有操作之后才会再试. 保险库未解锁时不做任何事, 锁定之后自然
 * 停止, 解锁之后自然恢复. 全程不写日志.
 */
export class AutoLockController {
  /**
   * 待完成的自动锁定, 没有时为 undefined.
   */
  private pending: PendingLock | undefined;

  /**
   * 空闲触发是否被抑制: 保险库不适用自动锁定时置位, 用户有操作后解除.
   */
  private isIdleSuppressed = false;

  /**
   * 是否有锁定尝试正在进行, 同一时刻只允许一个.
   */
  private isAttempting = false;

  /**
   * 取消周期检查的函数, 没启动时为 undefined.
   */
  private cancelCheck: (() => void) | undefined;

  /**
   * 取消系统事件订阅的函数.
   */
  private unsubscribers: Array<() => void> = [];

  /**
   * 创建自动锁定控制.
   * @param dependencies 控制依赖.
   */
  constructor(private readonly dependencies: AutoLockControllerDependencies) {}

  /**
   * 启动: 开始周期检查并订阅系统锁屏与休眠. 重复调用无效.
   */
  start(): void {
    if (this.cancelCheck !== undefined) {
      return;
    }
    const { clock, activity } = this.dependencies;
    this.cancelCheck = clock.every(
      () => void this.check(),
      AUTO_LOCK_CHECK_INTERVAL_MILLISECONDS,
    );
    this.unsubscribers = [
      activity.onScreenLock(() => this.handleEvent("screen-lock")),
      activity.onSuspend(() => this.handleEvent("sleep")),
    ];
  }

  /**
   * 停止: 取消周期检查与系统事件订阅, 丢弃待完成的锁定. 已经在进行的锁定尝试不被打断.
   */
  stop(): void {
    this.cancelCheck?.();
    this.cancelCheck = undefined;
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
    this.resetState();
  }

  /**
   * 清空待完成的锁定与抑制状态.
   */
  private resetState(): void {
    this.pending = undefined;
    this.isIdleSuppressed = false;
  }

  /**
   * 读取设置, 读取抛错时返回 undefined, 这个周期什么也不做.
   * @returns 自动锁定设置.
   */
  private readSettingsSafely(): AutoLockSettings | undefined {
    try {
      return this.dependencies.readSettings();
    } catch {
      return undefined;
    }
  }

  /**
   * 一个检查周期: 未解锁则清空状态; 已解锁则刷新待完成的锁定并尝试一次. 意外错误不外泄.
   * @returns 本周期处理完后兑现.
   */
  private async check(): Promise<void> {
    if (this.isAttempting) {
      return;
    }
    const { vault, activity } = this.dependencies;
    if (!vault.isUnlocked()) {
      this.resetState();
      return;
    }
    const settings = this.readSettingsSafely();
    if (settings === undefined) {
      return;
    }
    this.refreshPending(settings, activity.getIdleSeconds());
    await this.attempt().catch(() => undefined);
  }

  /**
   * 按设置与最新的空闲秒数刷新待完成的锁定: 用户有操作就解除抑制并取消空闲的待锁定, 开关被关掉的
   * 待锁定也取消, 没有待锁定而空闲已到时长就产生一个空闲的待锁定.
   * @param settings 自动锁定设置.
   * @param idleSeconds 系统已空闲的秒数.
   */
  private refreshPending(
    settings: AutoLockSettings,
    idleSeconds: number,
  ): void {
    const hasIdled =
      settings.isIdleLockEnabled && hasIdleReached(settings, idleSeconds);
    if (!hasIdled) {
      this.isIdleSuppressed = false;
    }
    const { pending } = this;
    if (
      pending !== undefined &&
      !this.isPendingStillWanted(pending, settings, hasIdled)
    ) {
      this.pending = undefined;
    }
    if (this.pending === undefined && hasIdled && !this.isIdleSuppressed) {
      this.pending = { reason: "idle", deferredChecks: 0 };
    }
  }

  /**
   * 判断一个待完成的锁定是否还要继续: 对应的开关仍开着, 空闲的待锁定还要用户仍然空闲.
   * @param pending 待完成的锁定.
   * @param settings 自动锁定设置.
   * @param hasIdled 空闲是否已到设置的时长.
   * @returns 还要继续时为 true.
   */
  private isPendingStillWanted(
    pending: PendingLock,
    settings: AutoLockSettings,
    hasIdled: boolean,
  ): boolean {
    if (!isReasonEnabled(settings, pending.reason)) {
      return false;
    }
    return pending.reason !== "idle" || hasIdled;
  }

  /**
   * 处理系统锁屏或休眠事件: 对应开关开启且保险库已解锁时产生待锁定并立刻尝试一次, 已有待锁定时
   * 不重复产生.
   * @param reason 事件对应的原因.
   */
  private handleEvent(reason: AutoLockReason): void {
    if (this.pending !== undefined || !this.dependencies.vault.isUnlocked()) {
      return;
    }
    const settings = this.readSettingsSafely();
    if (settings === undefined || !isReasonEnabled(settings, reason)) {
      return;
    }
    this.pending = { reason, deferredChecks: 0 };
    void this.attempt().catch(() => undefined);
  }

  /**
   * 尝试完成待完成的锁定, 同一时刻只有一个尝试在进行.
   * @returns 尝试结束并处理完结果后兑现.
   */
  private async attempt(): Promise<void> {
    const { pending } = this;
    if (pending === undefined || this.isAttempting) {
      return;
    }
    this.isAttempting = true;
    try {
      const outcome = await attemptAutoLock(
        this.dependencies.vault,
        pending.deferredChecks,
      );
      this.applyOutcome(pending, outcome);
    } finally {
      this.isAttempting = false;
    }
  }

  /**
   * 按尝试的结果更新状态: 锁定成功通知回调; 被挡住累计次数留到下个周期; 不适用的保险库放弃, 空闲
   * 触发另置抑制; 其它情形放弃.
   * @param pending 本次尝试的待锁定.
   * @param outcome 尝试结果的归类.
   */
  private applyOutcome(
    pending: PendingLock,
    outcome: AutoLockAttemptOutcome,
  ): void {
    if (outcome === "deferred") {
      this.pending = {
        reason: pending.reason,
        deferredChecks: pending.deferredChecks + 1,
      };
      return;
    }
    this.pending = undefined;
    if (outcome === "not-applicable") {
      this.isIdleSuppressed = pending.reason === "idle";
    }
    if (outcome === "locked") {
      this.dependencies.onLocked(pending.reason);
    }
  }
}
