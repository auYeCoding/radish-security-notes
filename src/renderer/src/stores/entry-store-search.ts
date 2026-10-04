import { toSearchMatches } from "@shared/search/search-matches";

import type { EntryStoreAccess } from "./entry-store-actions";

/**
 * 判断搜索框里的关键字是否为空: 去首尾空格后没有内容.
 * @param query 搜索框里的关键字.
 * @returns 关键字为空时返回 true.
 */
export function isBlankQuery(query: string): boolean {
  return query.trim() === "";
}

/**
 * 设置搜索关键字. 关键字为空时立即丢弃搜索结果, 列表恢复; 不为空时保留上一次的结果, 直到新的
 * 搜索返回, 列表不会闪成空白.
 * @param access store 动作能用到的东西.
 * @param query 搜索框里的关键字.
 */
export function applyQuery(access: EntryStoreAccess, query: string): void {
  access.set(
    isBlankQuery(query)
      ? { query, searchMatches: undefined, searchedQuery: "" }
      : { query },
  );
}

/**
 * 让主进程按当前关键字搜索, 把命中表放进 store. 关键字为空时只丢弃搜索结果, 不调用接口; 搜索期间
 * 关键字又变了, 过时的结果被丢弃; 搜索失败或接口抛出错误时保留上一次的结果.
 * @param access store 动作能用到的东西.
 * @returns 搜索完成后兑现.
 */
export async function runEntrySearch(access: EntryStoreAccess): Promise<void> {
  const { bridge, set, get } = access;
  const { query, searchMatches } = get();
  if (isBlankQuery(query)) {
    if (searchMatches !== undefined) {
      set({ searchMatches: undefined, searchedQuery: "" });
    }
    return;
  }
  try {
    const result = await bridge.search(query);
    if (result.ok && get().query === query) {
      set({
        searchMatches: toSearchMatches(result.value),
        searchedQuery: query,
      });
    }
  } catch {
    return;
  }
}
