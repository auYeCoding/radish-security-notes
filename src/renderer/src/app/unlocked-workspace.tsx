import { useEffect } from "react";

import { useEntryStore } from "@renderer/stores/use-entry-store";
import { useFolderStore } from "@renderer/stores/use-folder-store";
import { useTagStore } from "@renderer/stores/use-tag-store";

import { AppShell } from "./app-shell";

/**
 * 解锁之后的工作区: 挂载时从主进程读取全部文件夹, 标签与条目, 再渲染三栏主界面. 它只在保险库
 * 已解锁时才会挂载, 所以读取不会撞上未解锁的状态.
 * @returns 三栏主界面元素.
 */
export function UnlockedWorkspace(): React.JSX.Element {
  const loadEntries = useEntryStore((state) => state.load);
  const loadFolders = useFolderStore((state) => state.load);
  const loadTags = useTagStore((state) => state.load);
  useEffect(() => {
    void loadEntries();
    void loadFolders();
    void loadTags();
  }, [loadEntries, loadFolders, loadTags]);
  return <AppShell />;
}
