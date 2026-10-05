import { measureUpdateImpact } from "./custom-entry-type-impact";
import {
  CUSTOM_SUMMARY_FIELD_KEY,
  toCustomFieldKey,
} from "./custom-entry-type-key";
import type { CustomEntryTypeFormValues } from "./custom-entry-type-schema";
import type {
  CustomEntryType,
  CustomEntryTypeField,
} from "./custom-entry-type-types";

/**
 * 生成字段计划需要的信息.
 */
export interface CustomEntryTypeFieldPlanSource {
  /**
   * 修改前已保存的类型.
   */
  readonly current: CustomEntryType;
  /**
   * 经修改准入检查后的取值.
   */
  readonly values: CustomEntryTypeFormValues;
  /**
   * 生成唯一编号的函数, 每个需要新字段键的字段依次取用.
   */
  readonly createIdentifier: () => string;
}

/**
 * 一次类型修改的字段计划: 修改后每个字段的最终字段键, 以及已有条目的取值要怎样换键.
 */
export interface CustomEntryTypeFieldPlan {
  /**
   * 修改后的字段, 带最终字段键, 顺序就是提交的顺序.
   */
  readonly fields: readonly CustomEntryTypeField[];
  /**
   * 保留下来的已有字段的新旧字段键对照: 键是修改前的字段键, 值是修改后的字段键, 键没变的字段
   * 两者相同.
   */
  readonly keptKeys: ReadonlyMap<string, string>;
  /**
   * 被删除的已有字段在修改前的字段键.
   */
  readonly removedKeys: readonly string[];
}

/**
 * 决定一个提交字段的最终字段键: 摘要字段取固定的摘要键, 新增字段与不再是摘要的原摘要字段分配
 * 新的字段键, 其余已有字段保持原键.
 * @param field 提交的字段.
 * @param createIdentifier 生成唯一编号的函数.
 * @returns 最终字段键.
 */
function resolveFieldKey(
  field: CustomEntryTypeFormValues["fields"][number],
  createIdentifier: () => string,
): string {
  if (field.isSummary) {
    return CUSTOM_SUMMARY_FIELD_KEY;
  }
  if (field.key === undefined || field.key === CUSTOM_SUMMARY_FIELD_KEY) {
    return toCustomFieldKey(createIdentifier());
  }
  return field.key;
}

/**
 * 由修改前的类型与校验后的取值生成字段计划: 摘要字段的键固定是 `account`, 换摘要字段时已有条目里
 * 的取值要随键迁移; 新增字段与不再是摘要的原摘要字段分配新的 `field-` 键; 提交里没有的已有字段
 * 是被删除的.
 * @param source 修改前的类型, 校验后的取值与编号生成函数.
 * @returns 字段计划.
 */
export function planCustomEntryTypeFields(
  source: CustomEntryTypeFieldPlanSource,
): CustomEntryTypeFieldPlan {
  const { current, values, createIdentifier } = source;
  const resolvedKeys = values.fields.map((field) =>
    resolveFieldKey(field, createIdentifier),
  );
  const keptKeys = new Map(
    values.fields.flatMap((field, index) =>
      field.key === undefined
        ? []
        : [[field.key, resolvedKeys[index]] as const],
    ),
  );
  return {
    fields: values.fields.map((field, index) => ({
      key: resolvedKeys[index],
      name: field.name,
      kind: field.kind,
      isSensitive: field.isSensitive,
    })),
    keptKeys,
    removedKeys: measureUpdateImpact(current, values.fields).removedFields.map(
      (field) => field.key,
    ),
  };
}
