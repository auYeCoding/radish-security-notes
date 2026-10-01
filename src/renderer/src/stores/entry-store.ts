import type { EntryBridge } from "@shared/entries/entry-bridge";
import type { EntryResult } from "@shared/entries/entry-result";
import type {
  EntryCopyField,
  EntryDetail,
  NewEntryInput,
} from "@shared/entries/entry-types";
import { createStore, type StoreApi } from "zustand/vanilla";

import {
  copyEntryField,
  createEntry,
  loadEntries,
  selectEntry,
} from "./entry-store-actions";
import { INITIAL_ENTRY_STATE, type EntryState } from "./entry-state";

/**
 * 条目动作: 经主进程读取, 新建与复制条目, 并维护选中与搜索关键字.
 */
export interface EntryActions {
  /**
   * 读取全部条目的摘要.
   * @returns 读取完成后兑现.
   */
  load: () => Promise<void>;
  /**
   * 选中一个条目并读取它的详情.
   * @param id 条目编号.
   * @returns 详情读取完成后兑现.
   */
  select: (id: string) => Promise<void>;
  /**
   * 设置搜索关键字, 列表据此即时过滤.
   * @param query 搜索框里的关键字.
   */
  setQuery: (query: string) => void;
  /**
   * 新建一个条目, 成功后选中它.
   * @param input 用户填写的名称, 账号与密码.
   * @returns 新建结果.
   */
  create: (input: NewEntryInput) => Promise<EntryResult<EntryDetail>>;
  /**
   * 把条目的一个字段复制到系统剪贴板.
   * @param id 条目编号.
   * @param field 要复制的字段.
   * @returns 复制成功时为 true.
   */
  copyField: (id: string, field: EntryCopyField) => Promise<boolean>;
}

/**
 * 条目 store 的完整形状.
 */
export type EntryStore = StoreApi<EntryState & EntryActions>;

/**
 * 创建条目 store 的依赖.
 */
export interface EntryStoreDependencies {
  /**
   * 主进程提供的条目接口.
   */
  readonly bridge: EntryBridge;
}

/**
 * 创建条目 store. 状态不放在模块级变量里, 由启动流程创建后经 Provider 注入.
 * @param dependencies store 的依赖.
 * @returns 条目 store.
 */
export function createEntryStore(
  dependencies: EntryStoreDependencies,
): EntryStore {
  const { bridge } = dependencies;
  return createStore<EntryState & EntryActions>()((set, get) => {
    const access = { bridge, set, get };
    return {
      ...INITIAL_ENTRY_STATE,
      load: () => loadEntries(access),
      select: (id) => selectEntry(access, id),
      setQuery: (query) => set({ query }),
      create: (input) => createEntry(access, input),
      copyField: (id, field) => copyEntryField(bridge, id, field),
    };
  });
}
