import type { EntryBridge } from "@shared/entries/entry-bridge";
import { entryFailed, type EntryResult } from "@shared/entries/entry-result";
import {
  toEntrySummary,
  type EntryCopyField,
  type EntryDetail,
  type NewEntryInput,
} from "@shared/entries/entry-types";

import { selectedIdOf, type EntryState } from "./entry-state";

/**
 * 条目 store 动作能用到的东西: 主进程的条目接口, 以及读写 store 状态的方法.
 */
export interface EntryStoreAccess {
  /**
   * 主进程提供的条目接口.
   */
  readonly bridge: EntryBridge;
  /**
   * 合并更新 store 状态.
   */
  readonly set: (partial: Partial<EntryState>) => void;
  /**
   * 读取 store 当前状态.
   */
  readonly get: () => EntryState;
}

/**
 * 读取一个条目的详情, 接口调用抛出错误时按读取失败处理.
 * @param bridge 主进程提供的条目接口.
 * @param id 条目编号.
 * @returns 条目详情, 读取失败时为 undefined.
 */
async function fetchDetail(
  bridge: EntryBridge,
  id: string,
): Promise<EntryDetail | undefined> {
  try {
    const result = await bridge.get(id);
    return result.ok ? result.value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * 从主进程读取全部条目的摘要, 读取失败时标记失败状态.
 * @param access store 动作能用到的东西.
 * @returns 读取完成后兑现.
 */
export async function loadEntries(access: EntryStoreAccess): Promise<void> {
  const { bridge, set } = access;
  set({ loadStatus: "loading" });
  try {
    const result = await bridge.list();
    set(
      result.ok
        ? { entries: result.value, loadStatus: "ready" }
        : { loadStatus: "failed" },
    );
  } catch {
    set({ loadStatus: "failed" });
  }
}

/**
 * 选中一个条目并读取它的详情. 读取期间又选中了别的条目时, 丢弃过时的结果.
 * @param access store 动作能用到的东西.
 * @param id 要选中的条目编号.
 * @returns 读取完成后兑现.
 */
export async function selectEntry(
  access: EntryStoreAccess,
  id: string,
): Promise<void> {
  const { bridge, set, get } = access;
  set({ selection: { status: "loading", id } });
  const detail = await fetchDetail(bridge, id);
  const { selection } = get();
  if (selection.status !== "loading" || selectedIdOf(selection) !== id) {
    return;
  }
  set({
    selection:
      detail === undefined
        ? { status: "failed", id }
        : { status: "ready", detail },
  });
}

/**
 * 新建一个条目. 成功后条目放到列表最前, 被选中并展示详情, 搜索关键字清空, 让新条目
 * 一定出现在列表里.
 * @param access store 动作能用到的东西.
 * @param input 用户填写的名称, 账号, 密码, 网址, 备注与自定义字段.
 * @returns 新建结果, 接口调用抛出错误时为意外错误.
 */
export async function createEntry(
  access: EntryStoreAccess,
  input: NewEntryInput,
): Promise<EntryResult<EntryDetail>> {
  const { bridge, set, get } = access;
  try {
    const result = await bridge.create(input);
    if (result.ok) {
      set({
        entries: [toEntrySummary(result.value), ...get().entries],
        selection: { status: "ready", detail: result.value },
        query: "",
      });
    }
    return result;
  } catch {
    return entryFailed("unexpected-error");
  }
}

/**
 * 让主进程把条目的一个字段复制到剪贴板.
 * @param bridge 主进程提供的条目接口.
 * @param id 条目编号.
 * @param field 要复制的字段.
 * @returns 复制成功时为 true, 失败或接口调用抛出错误时为 false.
 */
export async function copyEntryField(
  bridge: EntryBridge,
  id: string,
  field: EntryCopyField,
): Promise<boolean> {
  try {
    const result = await bridge.copyField(id, field);
    return result.ok;
  } catch {
    return false;
  }
}

/**
 * 让主进程把条目的一个自定义字段的值复制到剪贴板.
 * @param bridge 主进程提供的条目接口.
 * @param id 条目编号.
 * @param customFieldId 自定义字段编号.
 * @returns 复制成功时为 true, 失败或接口调用抛出错误时为 false.
 */
export async function copyEntryCustomField(
  bridge: EntryBridge,
  id: string,
  customFieldId: string,
): Promise<boolean> {
  try {
    const result = await bridge.copyCustomField(id, customFieldId);
    return result.ok;
  } catch {
    return false;
  }
}
