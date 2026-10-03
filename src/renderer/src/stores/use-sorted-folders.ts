import { useMemo } from "react";

import type { FolderSummary } from "@shared/folders/folder-types";
import { sortByName } from "@shared/name-sorting/sort-by-name";

import { useFolderStore } from "./use-folder-store";

/**
 * 读取按名称排序规则排好序的文件夹列表. store 里的数组保持创建顺序, 名称排序键相同的文件夹按创建
 * 先后排列; 排序结果用 `useMemo` 缓存, 文件夹数组不变时引用不变, 新建与重命名后立即更新.
 * @returns 按名称排序的文件夹摘要.
 */
export function useSortedFolders(): readonly FolderSummary[] {
  const folders = useFolderStore((state) => state.folders);
  return useMemo(() => sortByName(folders), [folders]);
}
