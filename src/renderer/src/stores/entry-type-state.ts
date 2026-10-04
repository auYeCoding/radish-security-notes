import type { CustomEntryType } from "@shared/entries/custom-types/custom-entry-type-types";

/**
 * 自定义类型列表的读取状态.
 */
export type EntryTypeLoadStatus = "loading" | "ready" | "failed";

/**
 * 自定义条目类型 store 的状态. 预设类型在代码里定义, 不在这里.
 */
export interface EntryTypeState {
  /**
   * 全部自定义类型, 先创建的在前. 只在内存里, 不持久化.
   */
  readonly customTypes: readonly CustomEntryType[];
  /**
   * 列表的读取状态.
   */
  readonly loadStatus: EntryTypeLoadStatus;
}

/**
 * 自定义条目类型 store 的初始状态: 还没有读取, 没有自定义类型.
 */
export const INITIAL_ENTRY_TYPE_STATE: EntryTypeState = {
  customTypes: [],
  loadStatus: "loading",
};
