import { foldText } from "./fold-text";

/**
 * 匹配一段连续的空白, 含全角空格.
 */
const WHITESPACE = /\s+/u;

/**
 * 把搜索栏里的关键字拆成规范化后的词: 按空白拆开, 每个词按 `foldText` 规范化, 去掉规范化后为空的词
 * 与重复的词, 保持先后.
 * @param query 搜索栏里的关键字.
 * @returns 规范化后的词, 没有有效的词时为空数组.
 */
export function parseSearchQuery(query: string): readonly string[] {
  const terms = query
    .split(WHITESPACE)
    .map(foldText)
    .filter((term) => term.length > 0);
  return Array.from(new Set(terms));
}
