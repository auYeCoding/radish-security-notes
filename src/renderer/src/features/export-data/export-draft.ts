import { describeExportFormat } from "@shared/export/export-format-capabilities";
import {
  DEFAULT_EXPORT_FORMAT,
  type ExportFormatKey,
} from "@shared/export/export-format-keys";
import { isExportPassphraseLongEnough } from "@shared/export/export-limits";
import type { ExportScope } from "@shared/export/export-request";

/**
 * 导出对话框里可选的范围: 全部条目, 当前列表, 已勾选的条目.
 */
export const EXPORT_SCOPE_CHOICES = ["all", "current", "checked"] as const;

/**
 * 导出对话框里选的范围.
 */
export type ExportScopeChoice = (typeof EXPORT_SCOPE_CHOICES)[number];

/**
 * 判断一个值是否是导出范围的选项.
 * @param value 待判断的值.
 * @returns 是范围选项时返回 true.
 */
export function isExportScopeChoice(
  value: unknown,
): value is ExportScopeChoice {
  return EXPORT_SCOPE_CHOICES.some((choice) => choice === value);
}

/**
 * 用户在导出对话框第一步里填写的内容. 口令只在渲染端的内存里停留到导出结束或对话框关闭.
 */
export interface ExportDraft {
  /**
   * 选的格式.
   */
  readonly format: ExportFormatKey;
  /**
   * 选的范围.
   */
  readonly scopeChoice: ExportScopeChoice;
  /**
   * 是否包含保密字段与 TOTP 密钥.
   */
  readonly includeSecrets: boolean;
  /**
   * 是否包含附件, 格式不能带附件时无效.
   */
  readonly includeAttachments: boolean;
  /**
   * 是否口令加密.
   */
  readonly isEncrypted: boolean;
  /**
   * 加密口令.
   */
  readonly passphrase: string;
  /**
   * 确认口令.
   */
  readonly passphraseConfirmation: string;
}

/**
 * 对话框打开时的初始填写内容: 本应用完整格式, 全部条目, 含保密字段与附件, 不加密.
 */
export const INITIAL_EXPORT_DRAFT: ExportDraft = {
  format: DEFAULT_EXPORT_FORMAT,
  scopeChoice: "all",
  includeSecrets: true,
  includeAttachments: true,
  isEncrypted: false,
  passphrase: "",
  passphraseConfirmation: "",
};

/**
 * 加密口令的问题: 太短, 或两次输入不一致.
 */
export type PassphraseProblem = "too-short" | "mismatch";

/**
 * 找出加密口令现在的问题. 没勾选加密时没有问题.
 * @param draft 填写内容.
 * @returns 先看长度再看两次是否一致, 都没问题时为 undefined.
 */
export function findPassphraseProblem(
  draft: ExportDraft,
): PassphraseProblem | undefined {
  if (!draft.isEncrypted) {
    return undefined;
  }
  if (!isExportPassphraseLongEnough(draft.passphrase)) {
    return "too-short";
  }
  return draft.passphrase === draft.passphraseConfirmation
    ? undefined
    : "mismatch";
}

/**
 * 判断导出文件是否带附件: 所选格式能带, 且用户没有关掉.
 * @param draft 填写内容.
 * @returns 带附件时返回 true.
 */
export function willIncludeAttachments(draft: ExportDraft): boolean {
  return (
    describeExportFormat(draft.format).canCarryAttachments &&
    draft.includeAttachments
  );
}

/**
 * 由范围选项与渲染端知道的条目编号算出送给主进程的范围.
 * @param choice 选的范围.
 * @param currentIds 当前列表里的条目编号.
 * @param checkedIds 已勾选的条目编号.
 * @returns 送给主进程的范围.
 */
export function toExportScope(
  choice: ExportScopeChoice,
  currentIds: readonly string[],
  checkedIds: readonly string[],
): ExportScope {
  switch (choice) {
    case "current":
      return { kind: "entries", entryIds: currentIds };
    case "checked":
      return { kind: "entries", entryIds: checkedIds };
    default:
      return { kind: "all" };
  }
}
