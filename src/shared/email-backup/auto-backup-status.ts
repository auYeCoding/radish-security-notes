import {
  DEFAULT_AUTO_BACKUP_INTERVAL,
  type AutoBackupInterval,
} from "./auto-backup-interval";
import type { EmailBackupFailureReason } from "./email-backup-result";

/**
 * 自动备份当前所处的阶段.
 */
export const AUTO_BACKUP_PHASES = [
  "off",
  "scheduled",
  "due",
  "backing-off",
  "exhausted",
  "paused",
] as const;

/**
 * 自动备份的阶段: 关闭, 等待下次到点, 已到点等下一次检查, 失败后等待重试, 本间隔内已不再尝试,
 * 因认证失败而暂停.
 */
export type AutoBackupPhase = (typeof AUTO_BACKUP_PHASES)[number];

/**
 * 主进程交给渲染端的自动备份状态.
 */
export interface AutoBackupStatus {
  /**
   * 自动备份是否开启.
   */
  readonly isEnabled: boolean;
  /**
   * 选定的间隔.
   */
  readonly interval: AutoBackupInterval;
  /**
   * 当前阶段.
   */
  readonly phase: AutoBackupPhase;
  /**
   * 下次计划尝试的时刻, 自 1970 年起的毫秒数; 关闭, 暂停, 已到点或还没有成功记录时没有这一项.
   */
  readonly nextRunAt?: number;
  /**
   * 现在还不能开启自动备份的原因, 能开启时没有这一项. 取值沿用邮箱备份的失败原因码.
   */
  readonly blocker?: EmailBackupFailureReason;
  /**
   * 最近一次自动备份失败的原因, 之后有过成功备份或还没失败过时没有这一项.
   */
  readonly lastFailureReason?: EmailBackupFailureReason;
  /**
   * 最近一次自动备份失败的时刻, 自 1970 年起的毫秒数, 与 `lastFailureReason` 同时出现.
   */
  readonly lastFailureAt?: number;
}

/**
 * 还没读到主进程的状态之前的自动备份状态: 关闭, 默认间隔.
 */
export const DEFAULT_AUTO_BACKUP_STATUS: AutoBackupStatus = {
  isEnabled: false,
  interval: DEFAULT_AUTO_BACKUP_INTERVAL,
  phase: "off",
};

/**
 * 保存自动备份设置的请求.
 */
export interface AutoBackupSaveRequest {
  /**
   * 是否开启自动备份.
   */
  readonly isEnabled: boolean;
  /**
   * 选定的间隔.
   */
  readonly interval: AutoBackupInterval;
  /**
   * 用户重新输入的主密码, 开启自动备份且保险库设了主密码时必须给.
   */
  readonly masterPassword?: string;
}
