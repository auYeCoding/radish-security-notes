import {
  CUSTOM_SUMMARY_FIELD_KEY,
  toCustomFieldKey,
} from "@shared/entries/custom-types/custom-entry-type-key";
import type { CustomEntryTypeFormValues } from "@shared/entries/custom-types/custom-entry-type-schema";

import type {
  CustomEntryTypeFieldRecord,
  CustomEntryTypeRows,
} from "./custom-entry-type-repository";

/**
 * 生成自定义类型的行需要的信息.
 */
export interface CustomEntryTypeRowsSource {
  /**
   * 经新建类型校验方案校验后的取值.
   */
  readonly values: CustomEntryTypeFormValues;
  /**
   * 生成唯一编号的函数, 类型编号先取, 非摘要字段的编号依次接在后面.
   */
  readonly createIdentifier: () => string;
  /**
   * 创建时间的毫秒时间戳.
   */
  readonly createdAt: number;
}

/**
 * 由校验后的新建取值生成自定义类型的行: 分配类型编号, 摘要字段的键取 `account`, 其余字段的键
 * 由分配的编号生成, 字段位置按填写顺序.
 * @param source 校验后的取值, 编号生成函数与创建时间.
 * @returns 可以写入两张表的类型行与字段行.
 */
export function buildCustomEntryTypeRows(
  source: CustomEntryTypeRowsSource,
): CustomEntryTypeRows {
  const { values, createIdentifier } = source;
  const typeId = createIdentifier();
  const fields: CustomEntryTypeFieldRecord[] = values.fields.map(
    (field, position) => ({
      typeId,
      key: field.isSummary
        ? CUSTOM_SUMMARY_FIELD_KEY
        : toCustomFieldKey(createIdentifier()),
      position,
      name: field.name,
      kind: field.kind,
      isSensitive: field.isSensitive,
    }),
  );
  return {
    type: { id: typeId, name: values.name, createdAt: source.createdAt },
    fields,
  };
}
