/**
 * 内容没能带入本应用的原因代码, 显示时再换成当前语言的文案. 这是原因取值的唯一定义, 适配器,
 * 规划器, 清单文本与渲染端共用.
 */
export const NOT_IMPORTED_REASONS = [
  "type-unsupported",
  "name-invalid",
  "field-too-long",
  "row-malformed",
  "favorite-unsupported",
  "reprompt-unsupported",
  "password-history-unsupported",
  "passkey-unsupported",
  "archived-unsupported",
  "linked-field-unsupported",
  "totp-invalid",
  "tag-limit-exceeded",
  "tag-name-invalid",
  "folder-name-truncated",
  "custom-field-name-empty",
  "unparsable-field-line",
] as const;

/**
 * 内容没能带入本应用的一个原因代码.
 */
export type NotImportedReason = (typeof NOT_IMPORTED_REASONS)[number];

/**
 * 没能带入的内容属于哪一类对象: 一个条目, 一个文件夹, 或来源文件里的一行.
 */
export type NotImportedScope = "entry" | "folder" | "row";

/**
 * 未能带入清单里的一项. 只含对象的名称, 字段名称与原因代码, 不含任何字段的值.
 */
export interface NotImportedItem {
  /**
   * 对象的类别.
   */
  readonly scope: NotImportedScope;
  /**
   * 对象的名称: 条目名称, 文件夹名称, 或行所在的行号 (行没有名称时).
   */
  readonly name: string;
  /**
   * 没能带入的字段名称, 原因与具体字段无关时没有这一项.
   */
  readonly fieldName?: string;
  /**
   * 没能带入的原因代码.
   */
  readonly reason: NotImportedReason;
}

/**
 * 判断一个值是否是未能带入的原因代码.
 * @param value 待判断的值.
 * @returns 是原因代码时返回 true.
 */
export function isNotImportedReason(
  value: unknown,
): value is NotImportedReason {
  return NOT_IMPORTED_REASONS.some((reason) => reason === value);
}
