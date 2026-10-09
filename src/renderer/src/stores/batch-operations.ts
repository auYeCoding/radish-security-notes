import type { BatchBridge } from "@shared/batch/batch-bridge";
import { batchFailed, type BatchResult } from "@shared/batch/batch-result";
import type { EntryTagAssignment } from "@shared/batch/entry-tag-assignment";

import type { EntryActions } from "./entry-store";

/**
 * 批量操作成功后更新条目 store 内存状态用到的动作.
 */
export type BatchEntryActions = Pick<
  EntryActions,
  "applyBatchRemoval" | "applyBatchFolder" | "applyBatchTags" | "refresh"
>;

/**
 * 创建批量操作的依赖.
 */
export interface BatchOperationDependencies {
  /**
   * 主进程提供的批量接口.
   */
  readonly bridge: BatchBridge;
  /**
   * 更新条目 store 内存状态的动作.
   */
  readonly entryActions: BatchEntryActions;
  /**
   * 清空批量选中.
   */
  readonly clearChecked: () => void;
}

/**
 * 四种批量操作. 每个都先经批量接口在主进程里完成, 成功后清空批量选中并更新条目 store, 列表,
 * 侧栏计数与详情随之一致; 失败时整批都没有生效, 内存状态与批量选中保持原样, 返回失败原因.
 */
export interface BatchOperations {
  /**
   * 一次删除多个条目.
   * @param entryIds 要删除的条目编号.
   * @returns 删除结果.
   */
  removeEntries: (
    entryIds: readonly string[],
  ) => Promise<BatchResult<undefined>>;
  /**
   * 一次把多个条目放进文件夹, 或移出文件夹.
   * @param entryIds 要移动的条目编号.
   * @param folderId 目标文件夹编号, 移出文件夹时为 undefined.
   * @returns 移动结果.
   */
  moveEntries: (
    entryIds: readonly string[],
    folderId: string | undefined,
  ) => Promise<BatchResult<undefined>>;
  /**
   * 给多个条目各追加一个标签.
   * @param entryIds 要加标签的条目编号.
   * @param tagId 要追加的标签编号.
   * @returns 每个条目现在带的标签.
   */
  addTag: (
    entryIds: readonly string[],
    tagId: string,
  ) => Promise<BatchResult<readonly EntryTagAssignment[]>>;
  /**
   * 从多个条目上各摘掉一个标签.
   * @param entryIds 要摘标签的条目编号.
   * @param tagId 要摘掉的标签编号.
   * @returns 每个条目现在带的标签.
   */
  removeTag: (
    entryIds: readonly string[],
    tagId: string,
  ) => Promise<BatchResult<readonly EntryTagAssignment[]>>;
}

/**
 * 执行一次批量调用并处理结果: 成功时先清空批量选中, 再更新条目 store; 失败原因是有条目已不存在时
 * 静默重读条目列表, 让界面与数据库重新一致; 接口调用抛出错误时按意外错误处理.
 * @param dependencies 批量操作的依赖.
 * @param call 经批量接口发起的调用.
 * @param apply 成功后更新条目 store 的方法.
 * @returns 批量接口的结果.
 */
async function settle<Value>(
  dependencies: BatchOperationDependencies,
  call: () => Promise<BatchResult<Value>>,
  apply: (value: Value) => Promise<void>,
): Promise<BatchResult<Value>> {
  try {
    const result = await call();
    if (result.ok) {
      dependencies.clearChecked();
      await apply(result.value);
    } else if (result.reason === "not-found") {
      await dependencies.entryActions.refresh();
    }
    return result;
  } catch {
    return batchFailed("unexpected-error");
  }
}

/**
 * 创建批量操作. 不依赖 React, 方便单独测试.
 * @param dependencies 批量操作的依赖.
 * @returns 四种批量操作.
 */
export function createBatchOperations(
  dependencies: BatchOperationDependencies,
): BatchOperations {
  const { bridge, entryActions } = dependencies;
  return {
    removeEntries: (entryIds) =>
      settle(
        dependencies,
        () => bridge.removeEntries(entryIds),
        () => entryActions.applyBatchRemoval(entryIds),
      ),
    moveEntries: (entryIds, folderId) =>
      settle(
        dependencies,
        () => bridge.moveEntries(entryIds, folderId),
        () => entryActions.applyBatchFolder(entryIds, folderId),
      ),
    addTag: (entryIds, tagId) =>
      settle(
        dependencies,
        () => bridge.addTag(entryIds, tagId),
        (assignments) => entryActions.applyBatchTags(assignments),
      ),
    removeTag: (entryIds, tagId) =>
      settle(
        dependencies,
        () => bridge.removeTag(entryIds, tagId),
        (assignments) => entryActions.applyBatchTags(assignments),
      ),
  };
}
