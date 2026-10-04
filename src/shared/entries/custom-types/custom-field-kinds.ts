/**
 * 自定义条目类型字段支持的取值形态: 单行文本与多行文本. 是否保密另设开关, 与取值形态无关.
 */
export const CUSTOM_FIELD_KINDS = ["singleLine", "multiLine"] as const;

/**
 * 自定义条目类型字段的取值形态.
 */
export type CustomFieldKind = (typeof CUSTOM_FIELD_KINDS)[number];

/**
 * 新建字段默认的取值形态.
 */
export const DEFAULT_CUSTOM_FIELD_KIND: CustomFieldKind = "singleLine";

/**
 * 判断一个值是否是受支持的取值形态.
 * @param value 待判断的值.
 * @returns 是取值形态时返回 true.
 */
export function isCustomFieldKind(value: unknown): value is CustomFieldKind {
  return CUSTOM_FIELD_KINDS.some((kind) => kind === value);
}

/**
 * 判断取值形态是否是多行文本. 全项目只在这里比较取值形态的字面量, 其它位置都经这个函数判断.
 * @param kind 取值形态.
 * @returns 是多行文本时返回 true.
 */
export function isMultiLineKind(kind: CustomFieldKind): boolean {
  return kind === "multiLine";
}
