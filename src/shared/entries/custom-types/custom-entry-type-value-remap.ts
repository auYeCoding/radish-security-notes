import type { EntryFieldValues } from "../entry-types";
import type { CustomEntryTypeFieldPlan } from "./custom-entry-type-field-plan";

/**
 * 判断字段计划是否要改写已有条目: 有字段被删除, 或有保留的字段换了键.
 * @param plan 字段计划.
 * @returns 要改写条目时返回 true.
 */
export function isEntryRewriteNeeded(plan: CustomEntryTypeFieldPlan): boolean {
  return (
    plan.removedKeys.length > 0 ||
    Array.from(plan.keptKeys).some(([oldKey, newKey]) => oldKey !== newKey)
  );
}

/**
 * 按字段计划改写一个条目的类型字段取值: 只带上保留字段的取值并换成新键, 被删字段的取值与不属于
 * 任何字段的过期键都不再保留. 新键从零开始填, 所以两个字段互换键 (摘要字段对调) 也不会互相覆盖.
 * @param stored 条目表里保存的类型字段取值.
 * @param plan 字段计划.
 * @returns 改写后的类型字段取值.
 */
export function remapEntryFieldValues(
  stored: EntryFieldValues,
  plan: CustomEntryTypeFieldPlan,
): EntryFieldValues {
  return Object.fromEntries(
    Array.from(plan.keptKeys).flatMap(([oldKey, newKey]) =>
      stored[oldKey] === undefined ? [] : [[newKey, stored[oldKey]] as const],
    ),
  );
}

/**
 * 判断一批条目里是否有任何一个条目在给定字段键上填过非空值.
 * @param entries 条目的类型字段取值.
 * @param keys 字段键.
 * @returns 有非空值时返回 true.
 */
export function hasStoredValue(
  entries: readonly EntryFieldValues[],
  keys: readonly string[],
): boolean {
  return entries.some((stored) =>
    keys.some((key) => (stored[key] ?? "") !== ""),
  );
}
