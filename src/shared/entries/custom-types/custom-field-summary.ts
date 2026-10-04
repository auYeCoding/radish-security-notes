import { isMultiLineKind, type CustomFieldKind } from "./custom-field-kinds";

/**
 * 判断是否能作列表摘要所需的字段属性.
 */
export interface SummaryCandidate {
  /**
   * 取值形态.
   */
  readonly kind: CustomFieldKind;
  /**
   * 是否保密.
   */
  readonly isSensitive: boolean;
}

/**
 * 判断一个字段是否可以作为列表摘要: 必须是非保密的单行字段. 校验方案与表单里的摘要单选, 保密勾选,
 * 取值形态下拉都按这一条规则判断, 规则只在这里定义.
 * @param field 字段.
 * @returns 可以作摘要时返回 true.
 */
export function canBeSummary(field: SummaryCandidate): boolean {
  return !field.isSensitive && !isMultiLineKind(field.kind);
}
