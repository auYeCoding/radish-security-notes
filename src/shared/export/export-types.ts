import type { ExportFormatKey } from "./export-format-keys";
import type { ExportLossItem } from "./export-loss-reasons";

/**
 * 统计一个导出范围得到的概况. 只含计数, 不含任何条目的内容.
 */
export interface ExportScopeSummary {
  /**
   * 范围内的条目个数.
   */
  readonly entryCount: number;
  /**
   * 范围内条目带的附件个数.
   */
  readonly attachmentCount: number;
  /**
   * 范围内条目带的附件总字节数.
   */
  readonly attachmentBytes: number;
  /**
   * 保险库是否设了主密码, 设了的话导出前要重新输入主密码.
   */
  readonly hasMasterPassword: boolean;
}

/**
 * 导出完成后的摘要. 只含计数与标志, 不含文件路径与任何条目的内容.
 */
export interface ExportSummary {
  /**
   * 导出的格式.
   */
  readonly format: ExportFormatKey;
  /**
   * 写进文件的条目个数.
   */
  readonly entryCount: number;
  /**
   * 写进文件的附件个数, 不含附件时为 0.
   */
  readonly attachmentCount: number;
  /**
   * 文件的字节数.
   */
  readonly fileSizeBytes: number;
  /**
   * 文件是否含附件.
   */
  readonly includesAttachments: boolean;
  /**
   * 文件是否含保密字段与 TOTP 密钥.
   */
  readonly includesSecrets: boolean;
  /**
   * 文件是否经口令加密.
   */
  readonly isEncrypted: boolean;
  /**
   * 这种格式实际带不出的内容的汇总, 个数为 0 的原因不列出.
   */
  readonly losses: readonly ExportLossItem[];
}

/**
 * 用户取消了保存对话框或导出的结果.
 */
export interface ExportCancelledOutcome {
  /**
   * 结果的状态, 取消时恒为 cancelled.
   */
  readonly status: "cancelled";
}

/**
 * 文件已写出的结果.
 */
export interface ExportSavedOutcome {
  /**
   * 结果的状态, 已写出时恒为 saved.
   */
  readonly status: "saved";
  /**
   * 导出摘要.
   */
  readonly summary: ExportSummary;
}

/**
 * 一次导出的结果: 用户取消, 或文件已写出.
 */
export type ExportRunOutcome = ExportCancelledOutcome | ExportSavedOutcome;

/**
 * 导出所处的阶段.
 */
export type ExportStage = "idle" | "preparing" | "writing" | "finishing";

/**
 * 导出进度的快照, 渲染端轮询它来显示进度.
 */
export interface ExportProgressSnapshot {
  /**
   * 当前阶段.
   */
  readonly stage: ExportStage;
  /**
   * 已处理的个数: 已读取的条目与已写完的附件.
   */
  readonly processed: number;
  /**
   * 要处理的总数, 总数未知或阶段没有细分进度时为 0.
   */
  readonly total: number;
}
