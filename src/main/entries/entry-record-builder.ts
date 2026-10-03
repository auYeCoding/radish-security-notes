import type { NewEntryFormValues } from "@shared/entries/new-entry-schema";
import type { PresetEntryTypeDefinition } from "@shared/entries/preset-entry-types";
import type { TotpConfig } from "@shared/entries/totp-config";
import {
  isTotpInputBlank,
  parseTotpInput,
} from "@shared/entries/totp-input-parser";

import { assignCustomFieldIdentifiers } from "./custom-field-records";
import type { EntryRecord } from "./entry-repository";

/**
 * 生成条目行需要的信息.
 */
export interface EntryRecordSource {
  /**
   * 条目的类型定义.
   */
  readonly type: PresetEntryTypeDefinition;
  /**
   * 经新建校验方案校验后的取值.
   */
  readonly values: NewEntryFormValues;
  /**
   * 生成唯一编号的函数, 条目编号先取, 自定义字段编号依次接在后面.
   */
  readonly createIdentifier: () => string;
  /**
   * 创建时间的毫秒时间戳.
   */
  readonly createdAt: number;
}

/**
 * 把校验后的 TOTP 输入解析成要存的配置.
 * @param input 经新建校验方案校验后的 TOTP 输入.
 * @returns TOTP 配置, 输入为空表示不带 TOTP 时为 null.
 * @throws Error 当输入没有经过校验而不能解析时.
 */
export function resolveTotpConfig(input: string): TotpConfig | null {
  if (isTotpInputBlank(input)) {
    return null;
  }
  const result = parseTotpInput(input);
  if (!result.ok) {
    throw new Error("TOTP 输入没有经过校验");
  }
  return result.config;
}

/**
 * 由校验后的新建取值生成条目行: 分配条目编号与自定义字段编号, 解析 TOTP, 记下类型与创建
 * 时间.
 * @param source 类型, 校验后的取值, 编号生成函数与创建时间.
 * @returns 可以写入条目表的行.
 */
export function buildEntryRecord(source: EntryRecordSource): EntryRecord {
  const { type, values, createIdentifier } = source;
  return {
    id: createIdentifier(),
    name: values.name,
    type: type.key,
    fields: values.fields,
    notes: values.notes,
    customFields: assignCustomFieldIdentifiers(
      values.customFields,
      createIdentifier,
    ),
    totp: resolveTotpConfig(values.totp),
    createdAt: source.createdAt,
  };
}
