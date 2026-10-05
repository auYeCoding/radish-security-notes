import { useCallback } from "react";

import { useEntryStore } from "@renderer/stores/use-entry-store";
import { useFolderStore } from "@renderer/stores/use-folder-store";
import { useTagStore } from "@renderer/stores/use-tag-store";

/**
 * 取出导入完成后刷新界面数据的函数: 重新向主进程读取条目, 文件夹与标签, 让列表里出现导入的内容.
 * @returns 刷新函数, 读取完成后兑现.
 */
export function useRefreshAfterImport(): () => Promise<void> {
  const loadEntries = useEntryStore((state) => state.load);
  const loadFolders = useFolderStore((state) => state.load);
  const loadTags = useTagStore((state) => state.load);
  return useCallback(async () => {
    await Promise.all([loadEntries(), loadFolders(), loadTags()]);
  }, [loadEntries, loadFolders, loadTags]);
}
