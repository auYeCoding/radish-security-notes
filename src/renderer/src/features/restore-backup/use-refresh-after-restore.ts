import { useCallback } from "react";

import { useEntryStore } from "@renderer/stores/use-entry-store";
import { useEntryTypeStore } from "@renderer/stores/use-entry-type-store";
import { useFolderStore } from "@renderer/stores/use-folder-store";
import { useTagStore } from "@renderer/stores/use-tag-store";

/**
 * 取出恢复完成后刷新界面数据的函数: 重新向主进程读取自定义条目类型, 条目, 文件夹与标签, 让列表里
 * 换成恢复出来的内容.
 * @returns 刷新函数, 读取完成后兑现.
 */
export function useRefreshAfterRestore(): () => Promise<void> {
  const loadEntryTypes = useEntryTypeStore((state) => state.load);
  const loadEntries = useEntryStore((state) => state.load);
  const loadFolders = useFolderStore((state) => state.load);
  const loadTags = useTagStore((state) => state.load);
  return useCallback(async () => {
    await Promise.all([
      loadEntryTypes(),
      loadEntries(),
      loadFolders(),
      loadTags(),
    ]);
  }, [loadEntryTypes, loadEntries, loadFolders, loadTags]);
}
