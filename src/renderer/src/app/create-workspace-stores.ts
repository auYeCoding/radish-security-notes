import type { RendererApi } from "@shared/ipc/renderer-api";

import {
  createBatchSelectionStore,
  type BatchSelectionStore,
} from "@renderer/stores/batch-selection-store";
import {
  createEntryStore,
  type EntryStore,
} from "@renderer/stores/entry-store";
import {
  createEntryTypeStore,
  type EntryTypeStore,
} from "@renderer/stores/entry-type-store";
import {
  createFolderStore,
  type FolderStore,
} from "@renderer/stores/folder-store";
import { createTagStore, type TagStore } from "@renderer/stores/tag-store";

/**
 * 解锁后的工作区用到的全部 store.
 */
export interface WorkspaceStores {
  /**
   * 条目 store.
   */
  readonly entryStore: EntryStore;
  /**
   * 自定义条目类型 store.
   */
  readonly entryTypeStore: EntryTypeStore;
  /**
   * 文件夹 store.
   */
  readonly folderStore: FolderStore;
  /**
   * 标签 store.
   */
  readonly tagStore: TagStore;
  /**
   * 批量选中 store.
   */
  readonly batchSelectionStore: BatchSelectionStore;
}

/**
 * 创建解锁后的工作区用到的全部 store: 条目, 自定义条目类型, 文件夹, 标签与批量选中.
 * @param api preload 暴露的接口, 取其中条目, 自定义类型, 文件夹与标签四个桥.
 * @returns 全部 store.
 */
export function createWorkspaceStores(
  api: Pick<RendererApi, "entries" | "entryTypes" | "folders" | "tags">,
): WorkspaceStores {
  return {
    entryStore: createEntryStore({ bridge: api.entries }),
    entryTypeStore: createEntryTypeStore({ bridge: api.entryTypes }),
    folderStore: createFolderStore({ bridge: api.folders }),
    tagStore: createTagStore({ bridge: api.tags }),
    batchSelectionStore: createBatchSelectionStore(),
  };
}
