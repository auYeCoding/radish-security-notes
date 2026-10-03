import type { TagBridge } from "@shared/tags/tag-bridge";
import type { TagColorKey } from "@shared/tags/tag-colors";
import { tagFailed, type TagResult } from "@shared/tags/tag-result";
import type { TagSummary } from "@shared/tags/tag-types";

import type { TagState } from "./tag-state";

/**
 * 标签 store 动作能用到的东西: 主进程的标签接口, 以及读写 store 状态的方法.
 */
export interface TagStoreAccess {
  /**
   * 主进程提供的标签接口.
   */
  readonly bridge: TagBridge;
  /**
   * 合并更新 store 状态.
   */
  readonly set: (partial: Partial<TagState>) => void;
  /**
   * 读取 store 当前状态.
   */
  readonly get: () => TagState;
}

/**
 * 从主进程读取全部标签, 读取失败时标记失败状态.
 * @param access store 动作能用到的东西.
 * @returns 读取完成后兑现.
 */
export async function loadTags(access: TagStoreAccess): Promise<void> {
  const { bridge, set } = access;
  set({ loadStatus: "loading" });
  try {
    const result = await bridge.list();
    set(
      result.ok
        ? { tags: result.value, loadStatus: "ready" }
        : { loadStatus: "failed" },
    );
  } catch {
    set({ loadStatus: "failed" });
  }
}

/**
 * 新建一个标签, 成功后追加到列表末尾.
 * @param access store 动作能用到的东西.
 * @param name 用户填写的名称.
 * @param color 用户选的颜色键.
 * @returns 新建结果, 接口调用抛出错误时为意外错误.
 */
export async function createTag(
  access: TagStoreAccess,
  name: string,
  color: TagColorKey,
): Promise<TagResult<TagSummary>> {
  const { bridge, set, get } = access;
  try {
    const result = await bridge.create(name, color);
    if (result.ok) {
      set({ tags: [...get().tags, result.value] });
    }
    return result;
  } catch {
    return tagFailed("unexpected-error");
  }
}

/**
 * 编辑一个标签的名称与颜色, 成功后列表里该标签原位换成新值.
 * @param access store 动作能用到的东西.
 * @param id 标签编号.
 * @param name 用户填写的新名称.
 * @param color 用户选的新颜色键.
 * @returns 编辑结果, 接口调用抛出错误时为意外错误.
 */
export async function updateTag(
  access: TagStoreAccess,
  id: string,
  name: string,
  color: TagColorKey,
): Promise<TagResult<TagSummary>> {
  const { bridge, set, get } = access;
  try {
    const result = await bridge.update(id, name, color);
    if (result.ok) {
      const updated = result.value;
      set({
        tags: get().tags.map((tag) => (tag.id === updated.id ? updated : tag)),
      });
    }
    return result;
  } catch {
    return tagFailed("unexpected-error");
  }
}

/**
 * 删除一个标签, 成功后从列表移除. 条目在内存里带的这个标签由条目 store 另行摘掉.
 * @param access store 动作能用到的东西.
 * @param id 标签编号.
 * @returns 删除结果, 接口调用抛出错误时为意外错误.
 */
export async function removeTag(
  access: TagStoreAccess,
  id: string,
): Promise<TagResult<undefined>> {
  const { bridge, set, get } = access;
  try {
    const result = await bridge.remove(id);
    if (result.ok) {
      set({ tags: get().tags.filter((tag) => tag.id !== id) });
    }
    return result;
  } catch {
    return tagFailed("unexpected-error");
  }
}
