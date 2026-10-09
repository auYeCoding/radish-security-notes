import type { FolderBridge } from "@shared/folders/folder-bridge";
import type { FolderResult } from "@shared/folders/folder-result";
import type { FolderSummary } from "@shared/folders/folder-types";
import { createStore, type StoreApi } from "zustand/vanilla";

import {
  assignEntryToFolder,
  createFolder,
  loadFolders,
  removeFolder,
  renameFolder,
} from "./folder-store-actions";
import { INITIAL_FOLDER_STATE, type FolderState } from "./folder-state";

/**
 * 文件夹动作: 经主进程读取, 新建, 重命名与删除文件夹, 并把条目放进文件夹.
 */
export interface FolderActions {
  /**
   * 读取全部文件夹.
   * @returns 读取完成后兑现.
   */
  load: () => Promise<void>;
  /**
   * 新建一个文件夹, 成功后追加到列表末尾.
   * @param name 用户填写的名称.
   * @returns 新建结果.
   */
  create: (name: string) => Promise<FolderResult<FolderSummary>>;
  /**
   * 重命名一个文件夹, 成功后列表立即换成新名称.
   * @param id 文件夹编号.
   * @param name 用户填写的新名称.
   * @returns 重命名结果.
   */
  rename: (id: string, name: string) => Promise<FolderResult<FolderSummary>>;
  /**
   * 删除一个文件夹, 成功后从列表移除.
   * @param id 文件夹编号.
   * @returns 删除结果.
   */
  remove: (id: string) => Promise<FolderResult<undefined>>;
  /**
   * 让主进程把一个条目放进文件夹, 或移出文件夹.
   * @param entryId 条目编号.
   * @param folderId 目标文件夹编号, 移出文件夹时为 undefined.
   * @returns 放入结果.
   */
  assignEntry: (
    entryId: string,
    folderId: string | undefined,
  ) => Promise<FolderResult<undefined>>;
}

/**
 * 文件夹 store 的完整形状.
 */
export type FolderStore = StoreApi<FolderState & FolderActions>;

/**
 * 创建文件夹 store 的依赖.
 */
export interface FolderStoreDependencies {
  /**
   * 主进程提供的文件夹接口.
   */
  readonly bridge: FolderBridge;
}

/**
 * 创建文件夹 store. 状态不放在模块级变量里, 由启动流程创建后经 Provider 注入.
 * @param dependencies store 的依赖.
 * @returns 文件夹 store.
 */
export function createFolderStore(
  dependencies: FolderStoreDependencies,
): FolderStore {
  const { bridge } = dependencies;
  return createStore<FolderState & FolderActions>()((set, get) => {
    const access = { bridge, set, get };
    return {
      ...INITIAL_FOLDER_STATE,
      load: () => loadFolders(access),
      create: (name) => createFolder(access, name),
      rename: (id, name) => renameFolder(access, id, name),
      remove: (id) => removeFolder(access, id),
      assignEntry: (entryId, folderId) =>
        assignEntryToFolder(bridge, entryId, folderId),
    };
  });
}
