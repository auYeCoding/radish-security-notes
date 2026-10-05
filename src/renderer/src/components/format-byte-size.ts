import type { TFunction } from "i18next";

/**
 * 相邻两个大小单位之间的字节倍数.
 */
const BYTES_PER_UNIT_STEP = 1024;

/**
 * 从小到大的大小单位文案键, 对应 B, KB, MB, GB.
 */
const SIZE_UNIT_KEYS = [
  "entryAttachments.size.bytes",
  "entryAttachments.size.kilobytes",
  "entryAttachments.size.megabytes",
  "entryAttachments.size.gigabytes",
] as const;

/**
 * 小数部分最多保留的位数.
 */
const MAX_FRACTION_DIGITS = 1;

/**
 * 把字节数格式化成带单位的大小: 按 1024 进制选最大的不超过它的单位, 单位以上保留最多一位小数.
 * @param size 字节数.
 * @param translate 翻译函数.
 * @param language 当前界面语言, 决定数字的写法.
 * @returns 形如 "1.5 MB" 的文本.
 */
export function formatByteSize(
  size: number,
  translate: TFunction,
  language: string,
): string {
  let value = size;
  let unitIndex = 0;
  while (
    value >= BYTES_PER_UNIT_STEP &&
    unitIndex < SIZE_UNIT_KEYS.length - 1
  ) {
    value /= BYTES_PER_UNIT_STEP;
    unitIndex += 1;
  }
  const formatted = new Intl.NumberFormat(language, {
    maximumFractionDigits: unitIndex === 0 ? 0 : MAX_FRACTION_DIGITS,
  }).format(value);
  return translate(SIZE_UNIT_KEYS[unitIndex], { value: formatted });
}
