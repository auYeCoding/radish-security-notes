import type { TFunction } from "i18next";

import type {
  ExportLossItem,
  ExportLossReason,
} from "@shared/export/export-loss-reasons";

/**
 * 每种带不出原因在结果页汇总里的文案键.
 */
const LOSS_MESSAGE_KEYS = {
  tags: "export.loss.tags",
  folders: "export.loss.folders",
  attachments: "export.loss.attachments",
  customEntryTypes: "export.loss.customEntryTypes",
  markdownNotes: "export.loss.markdownNotes",
  mergedTypes: "export.loss.mergedTypes",
  unsupportedEntries: "export.loss.unsupportedEntries",
  totp: "export.loss.totp",
  customFields: "export.loss.customFields",
  extraFields: "export.loss.extraFields",
} as const satisfies Record<ExportLossReason, string>;

/**
 * 每种带不出原因在选格式时的提示里的文案键.
 */
const EXCLUSION_MESSAGE_KEYS = {
  tags: "export.exclusion.tags",
  folders: "export.exclusion.folders",
  attachments: "export.exclusion.attachments",
  customEntryTypes: "export.exclusion.customEntryTypes",
  markdownNotes: "export.exclusion.markdownNotes",
  mergedTypes: "export.exclusion.mergedTypes",
  unsupportedEntries: "export.exclusion.unsupportedEntries",
  totp: "export.exclusion.totp",
  customFields: "export.exclusion.customFields",
  extraFields: "export.exclusion.extraFields",
} as const satisfies Record<ExportLossReason, string>;

/**
 * 把结果页汇总里的一项翻译成带个数的文案.
 * @param loss 汇总里的一项.
 * @param translate 翻译函数.
 * @returns 文案.
 */
export function describeExportLoss(
  loss: ExportLossItem,
  translate: TFunction,
): string {
  return translate(LOSS_MESSAGE_KEYS[loss.reason], { count: loss.count });
}

/**
 * 把选格式时提示里的一种带不出内容翻译成文案.
 * @param reason 带不出的原因.
 * @param translate 翻译函数.
 * @returns 文案.
 */
export function describeExportExclusion(
  reason: ExportLossReason,
  translate: TFunction,
): string {
  return translate(EXCLUSION_MESSAGE_KEYS[reason]);
}
