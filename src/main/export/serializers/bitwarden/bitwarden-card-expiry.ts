/**
 * 有效期的写法: 月与年之间是斜杠, 短横线或点号, 月 1 到 2 位, 年 2 位或 4 位.
 */
const EXPIRY_PATTERN = /^\s*(\d{1,2})\s*[/.-]\s*(\d{2}|\d{4})\s*$/;

/**
 * 两位年份补成四位年份时加上的世纪.
 */
const TWO_DIGIT_YEAR_PREFIX = "20";

/**
 * 解析好的有效期.
 */
export interface CardExpiry {
  /**
   * 月, 1 到 12, 不补前导零.
   */
  readonly month: string;
  /**
   * 年, 四位.
   */
  readonly year: string;
}

/**
 * 解析银行卡的有效期文本, 认得 `MM/YY`, `MM/YYYY` 以及用短横线或点号分隔的写法.
 * @param text 有效期文本.
 * @returns 解析好的有效期; 写法不认得或月份不在 1 到 12 时为 undefined.
 */
export function parseCardExpiry(text: string): CardExpiry | undefined {
  const match = EXPIRY_PATTERN.exec(text);
  if (match === null) {
    return undefined;
  }
  const month = Number(match[1]);
  const rawYear = match[2] ?? "";
  if (month < 1 || month > 12) {
    return undefined;
  }
  return {
    month: String(month),
    year: rawYear.length === 2 ? `${TWO_DIGIT_YEAR_PREFIX}${rawYear}` : rawYear,
  };
}
