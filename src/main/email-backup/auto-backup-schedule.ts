import {
  DEFAULT_AUTO_BACKUP_INTERVAL,
  type AutoBackupInterval,
} from "@shared/email-backup/auto-backup-interval";
import type { EmailBackupFailureReason } from "@shared/email-backup/email-backup-result";

/**
 * 自动备份的计划: 开关, 间隔与失败退避状态. 只在主进程里存在, 持久保存在加密库里.
 */
export interface AutoBackupSchedule {
  /**
   * 自动备份是否开启.
   */
  readonly isEnabled: boolean;
  /**
   * 选定的间隔.
   */
  readonly interval: AutoBackupInterval;
  /**
   * 最近一次自动尝试的时刻, 自 1970 年起的毫秒数, 退避等待据此计算.
   */
  readonly lastAttemptAt?: number;
  /**
   * 当前失败窗口内已连续失败的次数.
   */
  readonly failureCount: number;
  /**
   * 当前失败窗口里第一次失败的时刻, 窗口在它之后一个间隔结束.
   */
  readonly firstFailureAt?: number;
  /**
   * 是否因认证失败而暂停, 重新保存授权码后恢复.
   */
  readonly isPaused: boolean;
  /**
   * 最近一次自动备份失败的原因, 之后有过成功备份时清除.
   */
  readonly lastFailureReason?: EmailBackupFailureReason;
  /**
   * 最近一次自动备份失败的时刻, 与 `lastFailureReason` 同时出现.
   */
  readonly lastFailureAt?: number;
}

/**
 * 没保存过计划时的默认值: 关闭, 默认间隔, 没有失败记录.
 */
export const DEFAULT_AUTO_BACKUP_SCHEDULE: AutoBackupSchedule = {
  isEnabled: false,
  interval: DEFAULT_AUTO_BACKUP_INTERVAL,
  failureCount: 0,
  isPaused: false,
};
