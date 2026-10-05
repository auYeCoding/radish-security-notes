import type { ExportStage } from "../export/export-types";

/**
 * 邮箱备份的阶段: 生成备份文件沿用导出的阶段, 之后是发送.
 */
export type EmailBackupStage = ExportStage | "sending";

/**
 * 邮箱备份进度的快照, 渲染端轮询它来显示进度.
 */
export interface EmailBackupProgressSnapshot {
  /**
   * 当前阶段.
   */
  readonly stage: EmailBackupStage;
  /**
   * 已处理的个数, 阶段没有细分进度时为 0.
   */
  readonly processed: number;
  /**
   * 要处理的总数, 总数未知或阶段没有细分进度时为 0.
   */
  readonly total: number;
}
