/**
 * 导出文件里带不出的内容的原因代码. 每种原因的个数含义不同: `tags`, `folders`, `markdownNotes`,
 * `totp`, `customFields`, `extraFields`, `mergedTypes`, `downgradedSshKeys`, `unsupportedEntries`
 * 数的是受影响的条目数, `attachments` 数的是附件个数, `customEntryTypes` 数的是自定义类型个数.
 * `downgradedSshKeys` 是缺私钥, 缺公钥或公钥无法解析而按登录导出的 SSH 密钥条目.
 */
export const EXPORT_LOSS_REASONS = [
  "tags",
  "folders",
  "attachments",
  "customEntryTypes",
  "markdownNotes",
  "mergedTypes",
  "downgradedSshKeys",
  "unsupportedEntries",
  "totp",
  "customFields",
  "extraFields",
] as const;

/**
 * 导出文件里带不出的内容的原因代码.
 */
export type ExportLossReason = (typeof EXPORT_LOSS_REASONS)[number];

/**
 * 汇总里的一项: 一种带不出的原因与它的个数.
 */
export interface ExportLossItem {
  /**
   * 带不出的原因.
   */
  readonly reason: ExportLossReason;
  /**
   * 个数, 含义随原因而定.
   */
  readonly count: number;
}
