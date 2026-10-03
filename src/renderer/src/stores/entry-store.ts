import type { EntryBridge } from "@shared/entries/entry-bridge";
import type { EntryResult } from "@shared/entries/entry-result";
import type {
  EntryDetail,
  NewEntryInput,
  UpdateEntryInput,
} from "@shared/entries/entry-types";
import { createStore, type StoreApi } from "zustand/vanilla";

import {
  copyEntryCustomField,
  copyEntryField,
  createEntry,
  loadEntries,
  selectEntry,
} from "./entry-store-actions";
import { removeEntry, updateEntry } from "./entry-store-mutations";
import { INITIAL_ENTRY_STATE, type EntryState } from "./entry-state";

/**
 * 条目动作: 经主进程读取, 新建, 更新, 删除与复制条目字段, 并维护选中与搜索关键字.
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
   * @param input 用户选的类型, 填写的名称, 类型字段, 备注与自定义字段.
   * @returns 新建结果.
   */
  create: (input: NewEntryInput) => Promise<EntryResult<EntryDetail>>;
  /**
   * 更新一个条目, 成功后列表与详情立即换成新值.
   * @param id 条目编号.
   * @param input 用户填写的名称, 类型字段, 备注, 自定义字段与 TOTP 的处理方式.
   * @returns 更新结果.
   */
  update: (
    id: string,
    input: UpdateEntryInput,
  ) => Promise<EntryResult<EntryDetail>>;
  /**
   * 删除一个条目, 成功后条目从列表移除并选中相邻条目.
   * @param id 条目编号.
   * @returns 删除结果.
   */
  remove: (id: string) => Promise<EntryResult<undefined>>;
  /**
   * 把条目的一个字段复制到系统剪贴板.
   * @param id 条目编号.
   * @param field 要复制的字段名, 是备注或条目类型里的字段键.
   * @returns 复制成功时为 true.
   */
  copyField: (id: string, field: string) => Promise<boolean>;
  /**
   * 把条目的一个自定义字段的值复制到系统剪贴板.
   * @param id 条目编号.
   * @param customFieldId 自定义字段编号.
   * @returns 复制成功时为 true.
   */
  copyCustomField: (id: string, customFieldId: string) => Promise<boolean>;
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
      update: (id, input) => updateEntry(access, id, input),
      remove: (id) => removeEntry(access, id),
      copyField: (id, field) => copyEntryField(bridge, id, field),
      copyCustomField: (id, customFieldId) =>
        copyEntryCustomField(bridge, id, customFieldId),
    };
  });
}
