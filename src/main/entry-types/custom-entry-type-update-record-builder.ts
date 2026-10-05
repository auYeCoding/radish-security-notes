import type { CustomEntryTypeFieldPlan } from "@shared/entries/custom-types/custom-entry-type-field-plan";

import type { CustomEntryTypeRows } from "./custom-entry-type-repository";

/**
 * 生成更新后的类型行需要的信息.
 */
export interface UpdatedCustomEntryTypeRowsSource {
  /**
   * 修改前的类型行与字段行, 类型编号与创建时间沿用它.
   */
  readonly current: CustomEntryTypeRows;
  /**
   * 修改后的类型名称, 已去首尾空格.
   */
  readonly name: string;
  /**
   * 字段计划.
   */
  readonly plan: CustomEntryTypeFieldPlan;
}

/**
 * 由字段计划生成更新后的类型行与字段行: 类型编号与创建时间不变, 名称换成新名称, 字段行按计划里的
 * 顺序重新编位置.
 * @param source 修改前的行, 新名称与字段计划.
 * @returns 可以写入两张表的类型行与字段行.
 */
export function buildUpdatedCustomEntryTypeRows(
  source: UpdatedCustomEntryTypeRowsSource,
): CustomEntryTypeRows {
  const { current, name, plan } = source;
  return {
    type: { ...current.type, name },
    fields: plan.fields.map((field, position) => ({
      typeId: current.type.id,
      key: field.key,
      position,
      name: field.name,
      kind: field.kind,
      isSensitive: field.isSensitive,
    })),
  };
}
