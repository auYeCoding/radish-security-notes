import { EXPORT_SECRET_MAX_LENGTH } from "@shared/export/export-limits";

/**
 * 判断一个值是否是普通对象.
 * @param value 待判断的值.
 * @returns 是非 null 的对象时返回 true.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * 判断一个值是否是没给, 或长度不超过上限的字符串, 口令, 授权码与主密码用.
 * @param value 待判断的值.
 * @returns 合规时返回 true.
 */
export function isOptionalSecret(value: unknown): value is string | undefined {
  return (
    value === undefined ||
    (typeof value === "string" && value.length <= EXPORT_SECRET_MAX_LENGTH)
  );
}

/**
 * 判断一个值是否是长度不超过上限的字符串.
 * @param value 待判断的值.
 * @param maxLength 允许的最大字符数.
 * @returns 合规时返回 true.
 */
export function isStringWithin(
  value: unknown,
  maxLength: number,
): value is string {
  return typeof value === "string" && value.length <= maxLength;
}
