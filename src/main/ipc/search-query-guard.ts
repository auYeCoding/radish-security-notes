/**
 * 校验渲染进程传来的搜索关键字是字符串. 关键字里有没有有效的词由搜索判定.
 * @param query 渲染进程传来的值.
 * @returns 校验通过的搜索关键字.
 * @throws Error 当参数不是字符串时.
 */
export function requireSearchQuery(query: unknown): string {
  if (typeof query !== "string") {
    throw new Error("无效的搜索关键字");
  }
  return query;
}
