/**
 * 解析出的 JSON 对象, 键是字符串, 值的类型未知, 读取前要先收窄.
 */
export type JsonRecord = Readonly<Record<string, unknown>>;

/**
 * 判断一个值是否是 JSON 对象 (不含数组与 null).
 * @param value 待判断的值.
 * @returns 是对象时返回 true.
 */
export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 读出对象里的文本: 字符串原样返回, 数字转成字符串, 其余 (缺失, null, 布尔, 对象) 为空串.
 * @param record JSON 对象.
 * @param key 键.
 * @returns 文本.
 */
export function readText(record: JsonRecord, key: string): string {
  const value = record[key];
  if (typeof value === "string") {
    return value;
  }
  return typeof value === "number" ? String(value) : "";
}

/**
 * 读出对象里的数组, 不是数组时为空数组.
 * @param record JSON 对象.
 * @param key 键.
 * @returns 数组.
 */
export function readArray(record: JsonRecord, key: string): readonly unknown[] {
  const value = record[key];
  return Array.isArray(value) ? value : [];
}

/**
 * 读出对象里的子对象.
 * @param record JSON 对象.
 * @param key 键.
 * @returns 子对象, 缺失或不是对象时为空对象.
 */
export function readRecord(record: JsonRecord, key: string): JsonRecord {
  const value = record[key];
  return isJsonRecord(value) ? value : {};
}

/**
 * 读出对象里的数字.
 * @param record JSON 对象.
 * @param key 键.
 * @returns 数字, 缺失或不是数字时为 undefined.
 */
export function readNumber(
  record: JsonRecord,
  key: string,
): number | undefined {
  const value = record[key];
  return typeof value === "number" ? value : undefined;
}
