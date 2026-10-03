import { useCallback } from "react";

import type { FolderResult } from "@shared/folders/folder-result";

import { useEntryStore } from "./use-entry-store";
import { useFolderStore } from "./use-folder-store";

/**
 * 取得把条目放进文件夹的方法: 先经文件夹接口写入主进程, 成功后再更新条目在内存里的归属.
 * @returns 放入方法, 目标文件夹编号为 undefined 表示移回未分类.
 */
export function useMoveEntryToFolder(): (
  entryId: string,
  folderId: string | undefined,
) => Promise<FolderResult<undefined>> {
  const assignEntry = useFolderStore((state) => state.assignEntry);
  const applyEntryFolder = useEntryStore((state) => state.applyEntryFolder);
  return useCallback(
    async (entryId, folderId) => {
      const result = await assignEntry(entryId, folderId);
      if (result.ok) {
        await applyEntryFolder(entryId, folderId);
      }
      return result;
    },
    [assignEntry, applyEntryFolder],
  );
}
