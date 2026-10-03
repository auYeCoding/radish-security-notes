import type { FolderSummary } from "@shared/folders/folder-types";

/**
 * 文件夹列表的读取状态.
 */
export type FolderLoadStatus = "loading" | "ready" | "failed";

/**
 * 文件夹 store 的状态. 侧栏当前选中的入口属于条目列表的筛选条件, 放在条目 store 里.
 */
export interface FolderState {
  /**
   * 全部文件夹, 先创建的在前. 只在内存里, 不持久化.
   */
  readonly folders: readonly FolderSummary[];
  /**
   * 列表的读取状态.
   */
  readonly loadStatus: FolderLoadStatus;
}

/**
 * 文件夹 store 的初始状态: 还没有读取, 没有文件夹.
 */
export const INITIAL_FOLDER_STATE: FolderState = {
  folders: [],
  loadStatus: "loading",
};
