import { useEffect } from "react";

import { SEARCH_DEBOUNCE_MILLISECONDS } from "@shared/search/search-timing";

import { isBlankQuery } from "./entry-store-search";
import { useEntryStore } from "./use-entry-store";

/**
 * 在搜索入口挂载期间驱动搜索: 关键字变化后停止输入 `SEARCH_DEBOUNCE_MILLISECONDS` 毫秒才发起搜索,
 * 连续输入时只搜最后一次; 条目列表变化 (新建, 编辑, 删除, 读取完成) 时立即重新搜索, 让结果与最新
 * 条目一致. 关键字为空时不调用接口.
 */
export function useEntrySearchTrigger(): void {
  const query = useEntryStore((state) => state.query);
  const entries = useEntryStore((state) => state.entries);
  const search = useEntryStore((state) => state.search);
  useEffect(() => {
    if (isBlankQuery(query)) {
      return undefined;
    }
    const timer = setTimeout(() => void search(), SEARCH_DEBOUNCE_MILLISECONDS);
    return () => clearTimeout(timer);
  }, [query, search]);
  useEffect(() => {
    void search();
  }, [entries, search]);
}
