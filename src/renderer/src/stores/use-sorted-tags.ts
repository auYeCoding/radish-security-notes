import { useMemo } from "react";

import { sortByName } from "@shared/name-sorting/sort-by-name";
import type { TagSummary } from "@shared/tags/tag-types";

import { useTagStore } from "./use-tag-store";

/**
 * 读取按名称排序规则排好序的标签列表. store 里的数组保持创建顺序, 名称排序键相同的标签按创建
 * 先后排列; 排序结果用 `useMemo` 缓存, 标签数组不变时引用不变, 新建与编辑后立即更新.
 * @returns 按名称排序的标签摘要.
 */
export function useSortedTags(): readonly TagSummary[] {
  const tags = useTagStore((state) => state.tags);
  return useMemo(() => sortByName(tags), [tags]);
}
