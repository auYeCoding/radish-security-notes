/**
 * 把时刻格式化成界面语言的日期与时间.
 * @param epochMilliseconds 自 1970 年起的毫秒数.
 * @param language 当前界面语言, 决定写法.
 * @returns 形如 "2026年10月5日 20:30" 的文本.
 */
export function formatBackupTime(
  epochMilliseconds: number,
  language: string,
): string {
  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(epochMilliseconds);
}
