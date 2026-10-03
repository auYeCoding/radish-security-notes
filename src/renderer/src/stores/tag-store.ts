import type { TagBridge } from "@shared/tags/tag-bridge";
import type { TagColorKey } from "@shared/tags/tag-colors";
import type { TagResult } from "@shared/tags/tag-result";
import type { TagSummary } from "@shared/tags/tag-types";
import { createStore, type StoreApi } from "zustand/vanilla";

import { createTag, loadTags, removeTag, updateTag } from "./tag-store-actions";
import { INITIAL_TAG_STATE, type TagState } from "./tag-state";

/**
 * 标签动作: 经主进程读取, 新建, 编辑与删除标签.
 */
export interface TagActions {
  /**
   * 读取全部标签.
   * @returns 读取完成后兑现.
   */
  load: () => Promise<void>;
  /**
   * 新建一个标签, 成功后追加到列表末尾.
   * @param name 用户填写的名称.
   * @param color 用户选的颜色键.
   * @returns 新建结果.
   */
  create: (name: string, color: TagColorKey) => Promise<TagResult<TagSummary>>;
  /**
   * 编辑一个标签的名称与颜色, 成功后列表立即换成新值.
   * @param id 标签编号.
   * @param name 用户填写的新名称.
   * @param color 用户选的新颜色键.
   * @returns 编辑结果.
   */
  update: (
    id: string,
    name: string,
    color: TagColorKey,
  ) => Promise<TagResult<TagSummary>>;
  /**
   * 删除一个标签, 成功后从列表移除.
   * @param id 标签编号.
   * @returns 删除结果.
   */
  remove: (id: string) => Promise<TagResult<undefined>>;
}

/**
 * 标签 store 的完整形状.
 */
export type TagStore = StoreApi<TagState & TagActions>;

/**
 * 创建标签 store 的依赖.
 */
export interface TagStoreDependencies {
  /**
   * 主进程提供的标签接口.
   */
  readonly bridge: TagBridge;
}

/**
 * 创建标签 store. 状态不放在模块级变量里, 由启动流程创建后经 Provider 注入.
 * @param dependencies store 的依赖.
 * @returns 标签 store.
 */
export function createTagStore(dependencies: TagStoreDependencies): TagStore {
  const { bridge } = dependencies;
  return createStore<TagState & TagActions>()((set, get) => {
    const access = { bridge, set, get };
    return {
      ...INITIAL_TAG_STATE,
      load: () => loadTags(access),
      create: (name, color) => createTag(access, name, color),
      update: (id, name, color) => updateTag(access, id, name, color),
      remove: (id) => removeTag(access, id),
    };
  });
}
