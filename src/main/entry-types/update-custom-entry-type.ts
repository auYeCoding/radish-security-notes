import { admitCustomEntryTypeUpdate } from "@shared/entries/custom-types/custom-entry-type-edit-admission";
import type { UpdateCustomEntryTypeInput } from "@shared/entries/custom-types/custom-entry-type-edit-types";
import { measureUpdateImpact } from "@shared/entries/custom-types/custom-entry-type-impact";
import {
  customEntryTypeFailed,
  customEntryTypeSucceeded,
  type CustomEntryTypeResult,
} from "@shared/entries/custom-types/custom-entry-type-result";
import {
  planCustomEntryTypeFields,
  type CustomEntryTypeFieldPlan,
} from "@shared/entries/custom-types/custom-entry-type-field-plan";
import type { CustomEntryTypeFormValues } from "@shared/entries/custom-types/custom-entry-type-schema";
import type { CustomEntryType } from "@shared/entries/custom-types/custom-entry-type-types";
import {
  hasStoredValue,
  isEntryRewriteNeeded,
  remapEntryFieldValues,
} from "@shared/entries/custom-types/custom-entry-type-value-remap";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { toCustomEntryType } from "./custom-entry-type-mapper";
import { replaceCustomEntryType } from "./custom-entry-type-edit-repository";
import {
  listCustomEntryTypeRows,
  type CustomEntryTypeRows,
} from "./custom-entry-type-repository";
import { buildUpdatedCustomEntryTypeRows } from "./custom-entry-type-update-record-builder";
import {
  listEntriesOfType,
  updateEntryFieldValues,
  type TypeEntryRow,
} from "./type-entry-repository";

/**
 * 修改自定义类型用到的依赖.
 */
export interface UpdateCustomEntryTypeDependencies {
  /**
   * 生成新字段键用的唯一编号.
   */
  readonly createIdentifier: () => string;
}

/**
 * 判断这次修改是否真会降低保护或丢失取值: 有保密字段改成非保密, 或被删字段在该类型的条目里填过
 * 非空值.
 * @param current 修改前已保存的类型.
 * @param values 经修改准入检查后的取值.
 * @param plan 字段计划.
 * @param typeEntries 该类型下的条目行.
 * @returns 有真实影响, 需要用户先确认时返回 true.
 */
function isImpactReal(
  current: CustomEntryType,
  values: CustomEntryTypeFormValues,
  plan: CustomEntryTypeFieldPlan,
  typeEntries: readonly TypeEntryRow[],
): boolean {
  return (
    measureUpdateImpact(current, values.fields).unsensitizedFields.length > 0 ||
    hasStoredValue(
      typeEntries.map((entry) => entry.fields),
      plan.removedKeys,
    )
  );
}

/**
 * 在同一个事务里写入修改: 替换类型行与字段行, 需要时按字段计划改写该类型下每个条目的取值. 任何
 * 一步失败整体回滚.
 * @param orm 已解锁数据库的查询入口.
 * @param rows 修改后的类型行与字段行.
 * @param plan 字段计划.
 * @param typeEntries 该类型下的条目行.
 */
function writeUpdate(
  orm: VaultOrm,
  rows: CustomEntryTypeRows,
  plan: CustomEntryTypeFieldPlan,
  typeEntries: readonly TypeEntryRow[],
): void {
  orm.transaction((transaction) => {
    replaceCustomEntryType(transaction, rows);
    if (isEntryRewriteNeeded(plan)) {
      typeEntries.forEach((entry) =>
        updateEntryFieldValues(
          transaction,
          entry.id,
          remapEntryFieldValues(entry.fields, plan),
        ),
      );
    }
  });
}

/**
 * 修改一个自定义类型: 按共享层的准入检查校验输入, 算出字段计划, 删除字段会丢失条目取值或把保密
 * 字段改成非保密而用户没有确认时拒绝; 通过后类型行, 字段行与已有条目的取值在同一个事务里写入,
 * 任何一步失败整体回滚, 不留下半成功的状态. 搜索可搜键每次搜索时由库里的类型生成, 所以保密属性
 * 的变化在下一次搜索立即生效.
 * @param orm 已解锁数据库的查询入口.
 * @param dependencies 修改用到的依赖.
 * @param input 用户提交的修改.
 * @returns 修改后的自定义类型, 没有这个类型, 输入不合规, 重名或需要确认而未确认时为失败结果.
 */
export function updateCustomEntryType(
  orm: VaultOrm,
  dependencies: UpdateCustomEntryTypeDependencies,
  input: UpdateCustomEntryTypeInput,
): CustomEntryTypeResult<CustomEntryType> {
  const allRows = listCustomEntryTypeRows(orm);
  const currentRows = allRows.find((rows) => rows.type.id === input.id);
  if (currentRows === undefined) {
    return customEntryTypeFailed("not-found");
  }
  const current = toCustomEntryType(currentRows);
  const otherNames = allRows
    .filter((rows) => rows !== currentRows)
    .map((rows) => rows.type.name);
  const admitted = admitCustomEntryTypeUpdate(current, input, otherNames);
  if (!admitted.ok) {
    return admitted;
  }
  const plan = planCustomEntryTypeFields({
    current,
    values: admitted.value,
    createIdentifier: dependencies.createIdentifier,
  });
  const typeEntries = listEntriesOfType(orm, current.key);
  if (
    isImpactReal(current, admitted.value, plan, typeEntries) &&
    !input.isImpactConfirmed
  ) {
    return customEntryTypeFailed("confirmation-required");
  }
  const rows = buildUpdatedCustomEntryTypeRows({
    current: currentRows,
    name: admitted.value.name,
    plan,
  });
  writeUpdate(orm, rows, plan, typeEntries);
  return customEntryTypeSucceeded(toCustomEntryType(rows));
}
