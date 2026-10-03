import type { EditEntryFormValues } from "@shared/entries/edit-entry-schema";
import type { TotpConfig } from "@shared/entries/totp-config";
import { isTotpInputBlank } from "@shared/entries/totp-input-parser";

import { assignCustomFieldIdentifiers } from "./custom-field-records";
import { resolveTotpConfig } from "./entry-record-builder";
import type { EntryRecord } from "./entry-repository";

/**
 * 生成更新后的条目行需要的信息.
 */
export interface EntryUpdateSource {
  /**
   * 条目当前已保存的行.
   */
  readonly existing: EntryRecord;
  /**
   * 经编辑校验方案校验后的取值.
   */
  readonly values: EditEntryFormValues;
  /**
   * 生成唯一编号的函数, 自定义字段编号依次取用.
   */
  readonly createIdentifier: () => string;
}

/**
 * 决定更新后条目的 TOTP 配置: 要求移除时没有 TOTP, 输入为空时保持原配置 (含算法, 位数与周期),
 * 否则用输入解析出的新配置替换.
 * @param existing 条目当前的 TOTP 配置, 没有时为 null.
 * @param values 经编辑校验方案校验后的取值.
 * @returns 更新后的 TOTP 配置, 没有 TOTP 时为 null.
 * @throws Error 当替换用的输入没有经过校验而不能解析时.
 */
function resolveUpdatedTotp(
  existing: TotpConfig | null,
  values: EditEntryFormValues,
): TotpConfig | null {
  if (values.removeTotp) {
    return null;
  }
  if (isTotpInputBlank(values.totp)) {
    return existing;
  }
  return resolveTotpConfig(values.totp);
}

/**
 * 由已保存的行与校验后的编辑取值生成更新后的行: 编号, 类型与创建时间保持不变, 自定义字段重新
 * 分配编号, TOTP 按取值保持, 替换或移除.
 * @param source 已保存的行, 校验后的取值与编号生成函数.
 * @returns 可以写回条目表的行.
 */
export function buildUpdatedRecord(source: EntryUpdateSource): EntryRecord {
  const { existing, values, createIdentifier } = source;
  return {
    ...existing,
    name: values.name,
    fields: values.fields,
    notes: values.notes,
    customFields: assignCustomFieldIdentifiers(
      values.customFields,
      createIdentifier,
    ),
    totp: resolveUpdatedTotp(existing.totp, values),
  };
}
