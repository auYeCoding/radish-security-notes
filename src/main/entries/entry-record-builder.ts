import type { NewEntryFormValues } from "@shared/entries/new-entry-schema";
import type { PresetEntryTypeDefinition } from "@shared/entries/preset-entry-types";

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
 * 由校验后的新建取值生成条目行: 分配条目编号与自定义字段编号, 记下类型与创建时间.
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
    createdAt: source.createdAt,
  };
}
