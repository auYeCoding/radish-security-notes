import type {
  CustomEntryType,
  CustomEntryTypeField,
} from "./custom-entry-type-types";

/**
 * 判断修改影响所需的提交字段属性.
 */
export interface ImpactFieldInput {
  /**
   * 已有字段的字段键, 新增的字段没有这一项.
   */
  readonly key?: string;
  /**
   * 修改后是否保密.
   */
  readonly isSensitive: boolean;
}

/**
 * 一次类型修改对已有字段的影响.
 */
export interface CustomEntryTypeUpdateImpact {
  /**
   * 被删除的已有字段.
   */
  readonly removedFields: readonly CustomEntryTypeField[];
  /**
   * 由保密改成非保密的已有字段.
   */
  readonly unsensitizedFields: readonly CustomEntryTypeField[];
}

/**
 * 算出一次类型修改对已有字段的影响: 原有字段里没有出现在提交字段中的是被删除的, 提交字段里
 * 带着它的键且不再保密的, 是由保密改成非保密的. 渲染端用它预判是否要先请用户确认, 主进程用它
 * 判断是否需要确认标记.
 * @param current 修改前已保存的类型.
 * @param fields 用户提交的字段.
 * @returns 被删除的字段与由保密改成非保密的字段.
 */
export function measureUpdateImpact(
  current: CustomEntryType,
  fields: readonly ImpactFieldInput[],
): CustomEntryTypeUpdateImpact {
  const submittedByKey = new Map(
    fields.flatMap((field) =>
      field.key === undefined ? [] : [[field.key, field] as const],
    ),
  );
  return {
    removedFields: current.fields.filter(
      (field) => !submittedByKey.has(field.key),
    ),
    unsensitizedFields: current.fields.filter(
      (field) =>
        field.isSensitive &&
        submittedByKey.get(field.key)?.isSensitive === false,
    ),
  };
}

/**
 * 判断渲染端是否要在提交前先请用户确认: 有保密字段改成非保密, 或有字段被删除且类型下已有条目.
 * @param impact 这次修改的影响.
 * @param entryCount 类型下已有的条目个数.
 * @returns 需要先确认时返回 true.
 */
export function isUpdateConfirmationNeeded(
  impact: CustomEntryTypeUpdateImpact,
  entryCount: number,
): boolean {
  return (
    impact.unsensitizedFields.length > 0 ||
    (impact.removedFields.length > 0 && entryCount > 0)
  );
}
