import type { NewCustomFieldInput } from "@shared/entries/custom-field-types";

import type { SourceLoss } from "../source-adapter";
import {
  isJsonRecord,
  readArray,
  readNumber,
  readText,
  type JsonRecord,
} from "./json-values";

/**
 * Bitwarden 自定义字段的类型取值: 隐藏.
 */
const FIELD_TYPE_HIDDEN = 1;

/**
 * Bitwarden 自定义字段的类型取值: 关联到条目自身的某个字段, 没有可带入的值.
 */
const FIELD_TYPE_LINKED = 3;

/**
 * 条目的 JSON 里自定义字段与它带来的损失.
 */
export interface MappedCustomFields {
  /**
   * 能带入的自定义字段.
   */
  readonly customFields: readonly NewCustomFieldInput[];
  /**
   * 带不进的字段对应的损失.
   */
  readonly losses: readonly SourceLoss[];
}

/**
 * 把 Bitwarden 条目的 fields 数组映射成自定义字段: 隐藏类型保持隐藏, 文本与布尔 (值是 true 或
 * false 的文本) 是普通字段, 关联类型不带入并记为损失.
 * @param item Bitwarden 条目.
 * @returns 自定义字段与带不进的字段对应的损失.
 */
export function mapCustomFields(item: JsonRecord): MappedCustomFields {
  const customFields: NewCustomFieldInput[] = [];
  const losses: SourceLoss[] = [];
  for (const raw of readArray(item, "fields")) {
    if (!isJsonRecord(raw)) {
      continue;
    }
    const label = readText(raw, "name");
    if (readNumber(raw, "type") === FIELD_TYPE_LINKED) {
      losses.push({ reason: "linked-field-unsupported", fieldName: label });
    } else {
      customFields.push({
        label,
        value: readText(raw, "value"),
        isHidden: readNumber(raw, "type") === FIELD_TYPE_HIDDEN,
      });
    }
  }
  return { customFields, losses };
}

/**
 * 找出 Bitwarden 条目里带不进的内容: 收藏, 重新提示, 密码历史, 归档.
 * @param item Bitwarden 条目.
 * @returns 损失列表.
 */
export function findItemLosses(item: JsonRecord): readonly SourceLoss[] {
  const losses: SourceLoss[] = [];
  if (item.favorite === true) {
    losses.push({ reason: "favorite-unsupported" });
  }
  if (readNumber(item, "reprompt") === 1) {
    losses.push({ reason: "reprompt-unsupported" });
  }
  if (readArray(item, "passwordHistory").length > 0) {
    losses.push({ reason: "password-history-unsupported" });
  }
  if (readText(item, "archivedDate").length > 0) {
    losses.push({ reason: "archived-unsupported" });
  }
  return losses;
}
