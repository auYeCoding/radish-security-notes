import type { CustomEntryTypeBridge } from "@shared/entries/custom-types/custom-entry-type-bridge";
import {
  customEntryTypeFailed,
  type CustomEntryTypeResult,
} from "@shared/entries/custom-types/custom-entry-type-result";
import type {
  CustomEntryType,
  NewCustomEntryTypeInput,
} from "@shared/entries/custom-types/custom-entry-type-types";

import type { EntryTypeState } from "./entry-type-state";

/**
 * 自定义条目类型 store 动作能用到的东西: 主进程的类型接口, 以及读写 store 状态的方法.
 */
export interface EntryTypeStoreAccess {
  /**
   * 主进程提供的自定义条目类型接口.
   */
  readonly bridge: CustomEntryTypeBridge;
  /**
   * 合并更新 store 状态.
   */
  readonly set: (partial: Partial<EntryTypeState>) => void;
  /**
   * 读取 store 当前状态.
   */
  readonly get: () => EntryTypeState;
}

/**
 * 从主进程读取全部自定义类型, 读取失败时标记失败状态.
 * @param access store 动作能用到的东西.
 * @returns 读取完成后兑现.
 */
export async function loadCustomTypes(
  access: EntryTypeStoreAccess,
): Promise<void> {
  const { bridge, set } = access;
  set({ loadStatus: "loading" });
  try {
    const result = await bridge.list();
    set(
      result.ok
        ? { customTypes: result.value, loadStatus: "ready" }
        : { loadStatus: "failed" },
    );
  } catch {
    set({ loadStatus: "failed" });
  }
}

/**
 * 新建一个自定义类型, 成功后追加到列表末尾.
 * @param access store 动作能用到的东西.
 * @param input 用户填写的类型名称与字段.
 * @returns 新建结果, 接口调用抛出错误时为意外错误.
 */
export async function createCustomType(
  access: EntryTypeStoreAccess,
  input: NewCustomEntryTypeInput,
): Promise<CustomEntryTypeResult<CustomEntryType>> {
  const { bridge, set, get } = access;
  try {
    const result = await bridge.create(input);
    if (result.ok) {
      set({ customTypes: [...get().customTypes, result.value] });
    }
    return result;
  } catch {
    return customEntryTypeFailed("unexpected-error");
  }
}
