import type { TagSummary } from "@shared/tags/tag-types";

/**
 * 标签列表的读取状态.
 */
export type TagLoadStatus = "loading" | "ready" | "failed";

/**
 * 标签 store 的状态. 侧栏当前选中的标签属于条目列表的筛选条件, 放在条目 store 里.
 */
export interface TagState {
  /**
   * 全部标签, 先创建的在前. 只在内存里, 不持久化.
   */
  readonly tags: readonly TagSummary[];
  /**
   * 列表的读取状态.
   */
  readonly loadStatus: TagLoadStatus;
}

/**
 * 标签 store 的初始状态: 还没有读取, 没有标签.
 */
export const INITIAL_TAG_STATE: TagState = {
  tags: [],
  loadStatus: "loading",
};
