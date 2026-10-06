import type {
  EmailBackupResult,
  EmailBackupRunOutcome,
} from "@shared/email-backup/email-backup-result";
import type { UnattendedTriggerKind } from "@shared/email-backup/email-backup-trigger-kind";

import type { SchedulerClock } from "./scheduler-clock";

/**
 * 应用运行且已解锁期间, 每隔多久检查一次自动备份是否到点: 五分钟.
 */
export const AUTO_BACKUP_CHECK_INTERVAL_MILLISECONDS = 5 * 60 * 1000;

/**
 * 保险库还没解锁时, 每隔多久看一次它解锁了没有: 五秒.
 */
export const AUTO_BACKUP_UNLOCK_PROBE_INTERVAL_MILLISECONDS = 5 * 1000;

/**
 * 调度器能触发的备份检查, 由邮箱备份服务实现.
 */
export interface ScheduledBackupPort {
  /**
   * 检查一次自动备份, 没到点时什么也不做, 到点就备份, 与手动备份共用单飞锁.
   * @param triggerKind 触发方式.
   * @returns 检查与备份的结果.
   */
  readonly runScheduled: (
    triggerKind: UnattendedTriggerKind,
  ) => Promise<EmailBackupResult<EmailBackupRunOutcome | undefined>>;
}

/**
 * 自动备份调度器的依赖.
 */
export interface AutoBackupSchedulerDependencies {
  /**
   * 时钟端口.
   */
  readonly clock: SchedulerClock;
  /**
   * 判断保险库是否已解锁.
   */
  readonly isUnlocked: () => boolean;
  /**
   * 邮箱备份服务里的自动备份检查.
   */
  readonly backup: ScheduledBackupPort;
  /**
   * 检查意外失败时的回调, 参数是底层错误.
   */
  readonly onFailure: (error: unknown) => void;
}

/**
 * 自动备份调度器: 启动后等保险库解锁 (系统保护的保险库启动即解锁), 解锁后立即检查一次补发错过的
 * 备份, 之后每五分钟检查一次是否到点. 是否到点, 退避与单飞都由备份服务判断, 调度器只负责按时
 * 敲门; 检查出错只通知回调, 不让定时器停下.
 */
export class AutoBackupScheduler {
  /**
   * 是否已启动.
   */
  private isStarted = false;

  /**
   * 取消解锁探测的函数, 没在探测时为 undefined.
   */
  private cancelProbe: (() => void) | undefined;

  /**
   * 取消周期检查的函数, 没在检查时为 undefined.
   */
  private cancelCheck: (() => void) | undefined;

  /**
   * 创建调度器.
   * @param dependencies 调度器依赖.
   */
  constructor(private readonly dependencies: AutoBackupSchedulerDependencies) {}

  /**
   * 启动调度: 已解锁就立即开始检查, 否则每隔几秒看一次, 解锁后开始检查. 重复调用无效.
   */
  start(): void {
    if (this.isStarted) {
      return;
    }
    this.isStarted = true;
    if (this.dependencies.isUnlocked()) {
      this.beginChecking();
      return;
    }
    this.cancelProbe = this.dependencies.clock.every(
      () => this.probeUnlock(),
      AUTO_BACKUP_UNLOCK_PROBE_INTERVAL_MILLISECONDS,
    );
  }

  /**
   * 停止调度, 取消尚未触发的探测与检查. 正在进行的备份不被打断.
   */
  stop(): void {
    this.cancelProbe?.();
    this.cancelCheck?.();
    this.cancelProbe = undefined;
    this.cancelCheck = undefined;
    this.isStarted = false;
  }

  /**
   * 探测保险库是否已解锁, 解锁了就停止探测并开始检查.
   */
  private probeUnlock(): void {
    if (!this.dependencies.isUnlocked()) {
      return;
    }
    this.cancelProbe?.();
    this.cancelProbe = undefined;
    this.beginChecking();
  }

  /**
   * 立即检查一次 (启动补发), 然后开始周期检查.
   */
  private beginChecking(): void {
    this.check("catch-up");
    this.cancelCheck = this.dependencies.clock.every(
      () => this.check("scheduled"),
      AUTO_BACKUP_CHECK_INTERVAL_MILLISECONDS,
    );
  }

  /**
   * 检查一次自动备份, 出错只通知回调.
   * @param triggerKind 触发方式.
   */
  private check(triggerKind: UnattendedTriggerKind): void {
    const { backup, onFailure } = this.dependencies;
    backup.runScheduled(triggerKind).catch(onFailure);
  }
}
