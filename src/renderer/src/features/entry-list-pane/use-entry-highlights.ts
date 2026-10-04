import { useMemo } from "react";

import type { EntrySummary } from "@shared/entries/entry-types";
import type { TextRange } from "@shared/search/find-term-ranges";
import { highlightRanges } from "@shared/search/highlight-ranges";
import { parseSearchQuery } from "@shared/search/parse-search-query";
import type { EntrySearchField } from "@shared/search/search-fields";

import { useEntryStore } from "@renderer/stores/use-entry-store";

/**
 * 没有搜索命中时的高亮关键字, 引用固定.
 */
const NO_SEARCHED_QUERY = "";

/**
 * 一个列表项在搜索里的命中情况.
 */
export interface EntryHighlights {
  /**
   * 条目在最近一次搜索里命中的字段, 没有命中时为 undefined.
   */
  readonly hitFields: readonly EntrySearchField[] | undefined;
  /**
   * 名称里要高亮的区间.
   */
  readonly nameRanges: readonly TextRange[];
  /**
   * 账号里要高亮的区间.
   */
  readonly accountRanges: readonly TextRange[];
}

/**
 * 读取一个条目在搜索里的命中情况并算出名称与账号里的高亮区间. 高亮用最近一次完成的搜索的关键字,
 * 条目没有命中时不算; 所以输入新关键字而新结果还没返回时, 这里读到的值不变, 列表项不重新渲染,
 * 条目很多时输入不受拖慢.
 * @param entry 条目摘要.
 * @returns 命中字段与高亮区间.
 */
export function useEntryHighlights(entry: EntrySummary): EntryHighlights {
  const hitFields = useEntryStore((state) =>
    state.searchMatches?.get(entry.id),
  );
  const searchedQuery = useEntryStore((state) =>
    state.searchMatches?.has(entry.id)
      ? state.searchedQuery
      : NO_SEARCHED_QUERY,
  );
  const terms = useMemo(() => parseSearchQuery(searchedQuery), [searchedQuery]);
  const nameRanges = useMemo(
    () => highlightRanges(entry.name, terms, { withPinyin: true }),
    [entry.name, terms],
  );
  const accountRanges = useMemo(
    () => highlightRanges(entry.account, terms, { withPinyin: false }),
    [entry.account, terms],
  );
  return { hitFields, nameRanges, accountRanges };
}
