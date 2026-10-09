import { useCallback } from "react";

import type { FolderResult } from "@shared/folders/folder-result";

import { useEntryStore } from "./use-entry-store";
import { useFolderStore } from "./use-folder-store";

/**
 * 取得删除文件夹的方法: 先经文件夹接口在主进程删除, 成功后从列表移除文件夹, 并让其中条目在内存里
 * 变为无文件夹.
 * @returns 删除方法.
 */
export function useRemoveFolder(): (
  folderId: string,
) => Promise<FolderResult<undefined>> {
  const remove = useFolderStore((state) => state.remove);
  const releaseFolder = useEntryStore((state) => state.releaseFolder);
  return useCallback(
    async (folderId) => {
      const result = await remove(folderId);
      if (result.ok) {
        releaseFolder(folderId);
      }
      return result;
    },
    [remove, releaseFolder],
  );
}
