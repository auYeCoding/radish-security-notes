import type { CustomEntryTypeBridge } from "@shared/entries/custom-types/custom-entry-type-bridge";
import type {
  RemoveCustomEntryTypeInput,
  UpdateCustomEntryTypeInput,
} from "@shared/entries/custom-types/custom-entry-type-edit-types";
import type { CustomEntryTypeResult } from "@shared/entries/custom-types/custom-entry-type-result";
import type {
  CustomEntryType,
  NewCustomEntryTypeInput,
} from "@shared/entries/custom-types/custom-entry-type-types";
import { createStore, type StoreApi } from "zustand/vanilla";

import { createCustomType, loadCustomTypes } from "./entry-type-store-actions";
import {
  removeCustomType,
  updateCustomType,
} from "./entry-type-store-edit-actions";
import {
  INITIAL_ENTRY_TYPE_STATE,
  type EntryTypeState,
} from "./entry-type-state";

/**
 * 自定义条目类型动作: 经主进程读取, 新建, 修改与删除自定义类型.
 */
export interface EntryTypeActions {
  /**
   * 读取全部自定义类型.
   * @returns 读取完成后兑现.
   */
  load: () => Promise<void>;
  /**
   * 新建一个自定义类型, 成功后追加到列表末尾.
   * @param input 用户填写的类型名称与字段.
   * @returns 新建结果.
   */
  create: (
    input: NewCustomEntryTypeInput,
  ) => Promise<CustomEntryTypeResult<CustomEntryType>>;
  /**
   * 修改一个自定义类型, 成功后列表里的这个类型换成修改后的.
   * @param input 要修改的类型编号, 修改后的名称与字段, 以及用户是否已确认影响.
   * @returns 修改结果.
   */
  update: (
    input: UpdateCustomEntryTypeInput,
  ) => Promise<CustomEntryTypeResult<CustomEntryType>>;
  /**
   * 删除一个自定义类型, 成功后它从列表里移除.
   * @param input 要删除的类型编号, 以及用户是否已确认影响.
   * @returns 删除结果.
   */
  remove: (
    input: RemoveCustomEntryTypeInput,
  ) => Promise<CustomEntryTypeResult<undefined>>;
}

/**
 * 自定义条目类型 store 的完整形状.
 */
export type EntryTypeStore = StoreApi<EntryTypeState & EntryTypeActions>;

/**
 * 创建自定义条目类型 store 的依赖.
 */
export interface EntryTypeStoreDependencies {
  /**
   * 主进程提供的自定义条目类型接口.
   */
  readonly bridge: CustomEntryTypeBridge;
}

/**
 * 创建自定义条目类型 store. 状态不放在模块级变量里, 由启动流程创建后经 Provider 注入.
 * @param dependencies store 的依赖.
 * @returns 自定义条目类型 store.
 */
export function createEntryTypeStore(
  dependencies: EntryTypeStoreDependencies,
): EntryTypeStore {
  const { bridge } = dependencies;
  return createStore<EntryTypeState & EntryTypeActions>()((set, get) => {
    const access = { bridge, set, get };
    return {
      ...INITIAL_ENTRY_TYPE_STATE,
      load: () => loadCustomTypes(access),
      create: (input) => createCustomType(access, input),
      update: (input) => updateCustomType(access, input),
      remove: (input) => removeCustomType(access, input),
    };
  });
}
