import type { NewCustomFieldInput } from "@shared/entries/custom-field-types";
import {
  isTotpInputBlank,
  parseTotpInput,
} from "@shared/entries/totp-input-parser";

import type { ImportedEntryDraft, SourceLoss } from "./source-adapter";

/**
 * 未能带入清单里 TOTP 的字段名称.
 */
export const TOTP_FIELD_NAME = "TOTP";

/**
 * 处理过局部问题的草稿内容.
 */
export interface CleanedDraft {
  /**
   * 字段名不为空的自定义字段.
   */
  readonly customFields: readonly NewCustomFieldInput[];
  /**
   * 能解析的 TOTP 输入, 没有或无法解析时为空串.
   */
  readonly totp: string;
  /**
   * 因局部问题丢弃的内容对应的损失.
   */
  readonly losses: readonly SourceLoss[];
}

/**
 * 处理草稿里的局部问题: 字段名为空的自定义字段与无法解析的 TOTP 只丢弃出问题的那一项, 条目
 * 的其余内容照常带入.
 * @param draft 适配器输出的草稿.
 * @returns 处理后的自定义字段, TOTP 与丢弃内容对应的损失.
 */
export function cleanDraft(draft: ImportedEntryDraft): CleanedDraft {
  const losses: SourceLoss[] = [];
  const customFields = draft.customFields.filter((field) => {
    const hasLabel = field.label.trim().length > 0;
    if (!hasLabel) {
      losses.push({ reason: "custom-field-name-empty" });
    }
    return hasLabel;
  });
  if (isTotpInputBlank(draft.totp)) {
    return { customFields, totp: "", losses };
  }
  if (!parseTotpInput(draft.totp).ok) {
    losses.push({ reason: "totp-invalid", fieldName: TOTP_FIELD_NAME });
    return { customFields, totp: "", losses };
  }
  return { customFields, totp: draft.totp, losses };
}
