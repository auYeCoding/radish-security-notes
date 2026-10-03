import type { EntryDetail, EntrySummary } from "@shared/entries/entry-types";
import { ALL_ENTRIES_VIEW, type FolderView } from "@shared/folders/folder-view";

/**
 * 条目列表的读取状态.
 */
export type EntryLoadStatus = "loading" | "ready" | "failed";

/**
 * 没有选中任何条目.
 */
export interface NoEntrySelection {
  /**
   * 选中状态.
   */
  readonly status: "none";
}

/**
 * 已选中条目, 正在读取详情.
 */
export interface LoadingEntrySelection {
  /**
   * 选中状态.
   */
  readonly status: "loading";
  /**
   * 选中条目的编号.
   */
  readonly id: string;
}

/**
 * 已选中条目, 详情读取完成.
 */
export interface ReadyEntrySelection {
  /**
   * 选中状态.
   */
  readonly status: "ready";
  /**
   * 选中条目的详情, 含密码.
   */
  readonly detail: EntryDetail;
}

/**
 * 已选中条目, 详情读取失败.
 */
export interface FailedEntrySelection {
  /**
   * 选中状态.
   */
  readonly status: "failed";
  /**
   * 选中条目的编号.
   */
  readonly id: string;
}

/**
 * 当前选中的条目与它的详情读取进度.
 */
export type EntrySelection =
  | NoEntrySelection
  | LoadingEntrySelection
  | ReadyEntrySelection
  | FailedEntrySelection;

/**
 * 条目 store 的状态.
 */
export interface EntryState {
  /**
   * 全部条目的摘要, 最新创建的在最前. 只在内存里, 不持久化.
   */
  readonly entries: readonly EntrySummary[];
  /**
   * 列表的读取状态.
   */
  readonly loadStatus: EntryLoadStatus;
  /**
   * 当前选中的条目. 密码只存在于 `ready` 的详情里, 切换选中后丢弃.
   */
  readonly selection: EntrySelection;
  /**
   * 搜索框里的关键字.
   */
  readonly query: string;
  /**
   * 左侧栏当前选中的入口: 全部条目, 未分类或某个文件夹, 列表只显示属于它的条目, 搜索也只在其中
   * 进行. 只在内存里, 不持久化.
   */
  readonly view: FolderView;
  /**
   * 左侧栏当前选中的标签编号, 按选中的先后排列. 列表只显示带全部这些标签的条目, 与文件夹入口
   * 叠加取交集, 搜索也只在其中进行. 只在内存里, 不持久化.
   */
  readonly selectedTagIds: readonly string[];
  /**
   * 条目被编辑保存的次数. 详情视图把它放进 key, 让验证码与已显示的密钥在保存后回到最新.
   */
  readonly detailRevision: number;
}

/**
 * 条目 store 的初始状态: 还没有读取, 没有选中, 关键字为空, 入口是全部条目, 没有选中标签,
 * 还没有编辑过.
 */
export const INITIAL_ENTRY_STATE: EntryState = {
  entries: [],
  loadStatus: "loading",
  selection: { status: "none" },
  query: "",
  view: ALL_ENTRIES_VIEW,
  selectedTagIds: [],
  detailRevision: 0,
};

/**
 * 取出当前选中条目的编号.
 * @param selection 当前选中状态.
 * @returns 选中条目的编号, 没有选中时为 undefined.
 */
export function selectedIdOf(selection: EntrySelection): string | undefined {
  switch (selection.status) {
    case "none":
      return undefined;
    case "ready":
      return selection.detail.id;
    default:
      return selection.id;
  }
}
