/**
 * 把日期按本地时区格式化成 `YYYY-MM-DD`.
 * @param date 要格式化的日期.
 * @returns 形如 `2026-10-02` 的文本.
 */
export function formatLocalIsoDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
