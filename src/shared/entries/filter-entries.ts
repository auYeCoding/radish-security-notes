import type { EntrySummary } from "./entry-types";

/**
 * 判断文本是否包含已规范化的关键字, 不区分大小写.
 * @param text 待查找的文本.
 * @param needle 已去首尾空格并转为小写的关键字.
 * @returns 包含时返回 true.
 */
function containsNeedle(text: string, needle: string): boolean {
  return text.toLowerCase().includes(needle);
}

/**
 * 按关键字过滤条目: 名称或账号包含关键字 (不区分大小写) 的条目留下, 关键字去首尾空格,
 * 为空时返回全部条目. 保持原有顺序.
 * @param entries 全部条目摘要.
 * @param query 用户输入的关键字.
 * @returns 匹配的条目摘要.
 */
export function filterEntries(
  entries: readonly EntrySummary[],
  query: string,
): readonly EntrySummary[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return entries;
  }
  return entries.filter(
    (entry) =>
      containsNeedle(entry.name, needle) ||
      containsNeedle(entry.account, needle),
  );
}
