import type { FolderBridge } from "@shared/folders/folder-bridge";
import { folderFailed, type FolderResult } from "@shared/folders/folder-result";
import type { FolderSummary } from "@shared/folders/folder-types";

import type { FolderState } from "./folder-state";

/**
 * 文件夹 store 动作能用到的东西: 主进程的文件夹接口, 以及读写 store 状态的方法.
 */
export interface FolderStoreAccess {
  /**
   * 主进程提供的文件夹接口.
   */
  readonly bridge: FolderBridge;
  /**
   * 合并更新 store 状态.
   */
  readonly set: (partial: Partial<FolderState>) => void;
  /**
   * 读取 store 当前状态.
   */
  readonly get: () => FolderState;
}

/**
 * 从主进程读取全部文件夹, 读取失败时标记失败状态.
 * @param access store 动作能用到的东西.
 * @returns 读取完成后兑现.
 */
export async function loadFolders(access: FolderStoreAccess): Promise<void> {
  const { bridge, set } = access;
  set({ loadStatus: "loading" });
  try {
    const result = await bridge.list();
    set(
      result.ok
        ? { folders: result.value, loadStatus: "ready" }
        : { loadStatus: "failed" },
    );
  } catch {
    set({ loadStatus: "failed" });
  }
}

/**
 * 新建一个文件夹, 成功后追加到列表末尾.
 * @param access store 动作能用到的东西.
 * @param name 用户填写的名称.
 * @returns 新建结果, 接口调用抛出错误时为意外错误.
 */
export async function createFolder(
  access: FolderStoreAccess,
  name: string,
): Promise<FolderResult<FolderSummary>> {
  const { bridge, set, get } = access;
  try {
    const result = await bridge.create(name);
    if (result.ok) {
      set({ folders: [...get().folders, result.value] });
    }
    return result;
  } catch {
    return folderFailed("unexpected-error");
  }
}

/**
 * 重命名一个文件夹, 成功后列表里该文件夹原位换成新名称.
 * @param access store 动作能用到的东西.
 * @param id 文件夹编号.
 * @param name 用户填写的新名称.
 * @returns 重命名结果, 接口调用抛出错误时为意外错误.
 */
export async function renameFolder(
  access: FolderStoreAccess,
  id: string,
  name: string,
): Promise<FolderResult<FolderSummary>> {
  const { bridge, set, get } = access;
  try {
    const result = await bridge.rename(id, name);
    if (result.ok) {
      const renamed = result.value;
      set({
        folders: get().folders.map((folder) =>
          folder.id === renamed.id ? renamed : folder,
        ),
      });
    }
    return result;
  } catch {
    return folderFailed("unexpected-error");
  }
}

/**
 * 删除一个文件夹, 成功后从列表移除. 其中条目在内存里的归属由条目 store 另行释放.
 * @param access store 动作能用到的东西.
 * @param id 文件夹编号.
 * @returns 删除结果, 接口调用抛出错误时为意外错误.
 */
export async function removeFolder(
  access: FolderStoreAccess,
  id: string,
): Promise<FolderResult<undefined>> {
  const { bridge, set, get } = access;
  try {
    const result = await bridge.remove(id);
    if (result.ok) {
      set({ folders: get().folders.filter((folder) => folder.id !== id) });
    }
    return result;
  } catch {
    return folderFailed("unexpected-error");
  }
}

/**
 * 让主进程把一个条目放进文件夹, 或移出文件夹回到未分类. 条目在内存里的归属由条目 store 另行更新.
 * @param bridge 主进程提供的文件夹接口.
 * @param entryId 条目编号.
 * @param folderId 目标文件夹编号, 未分类时为 undefined.
 * @returns 放入结果, 接口调用抛出错误时为意外错误.
 */
export async function assignEntryToFolder(
  bridge: FolderBridge,
  entryId: string,
  folderId: string | undefined,
): Promise<FolderResult<undefined>> {
  try {
    return await bridge.assignEntry(entryId, folderId);
  } catch {
    return folderFailed("unexpected-error");
  }
}
