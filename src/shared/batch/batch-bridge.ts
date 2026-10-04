import type { BatchResult } from "./batch-result";
import type { EntryTagAssignment } from "./entry-tag-assignment";

/**
 * preload 暴露给渲染进程的批量接口. 渲染进程只传条目, 文件夹与标签的编号, 主进程在一个事务里
 * 完成整批操作, 失败时整批都不生效; 字段内容不经过这座桥.
 */
export interface BatchBridge {
  /**
   * 一次删除多个条目, 记录从加密数据库里移除, 条目带的标签关联随之清除.
   * @param entryIds 要删除的条目编号.
   * @returns 删除结果.
   */
  removeEntries: (
    entryIds: readonly string[],
  ) => Promise<BatchResult<undefined>>;
  /**
   * 一次把多个条目放进文件夹, 或移出文件夹回到未分类.
   * @param entryIds 要移动的条目编号.
   * @param folderId 目标文件夹编号, 移回未分类时为 undefined.
   * @returns 移动结果.
   */
  moveEntries: (
    entryIds: readonly string[],
    folderId: string | undefined,
  ) => Promise<BatchResult<undefined>>;
  /**
   * 给多个条目各追加一个标签, 条目已带这个标签时保持不变.
   * @param entryIds 要加标签的条目编号.
   * @param tagId 要追加的标签编号.
   * @returns 每个条目现在带的标签.
   */
  addTag: (
    entryIds: readonly string[],
    tagId: string,
  ) => Promise<BatchResult<readonly EntryTagAssignment[]>>;
  /**
   * 从多个条目上各摘掉一个标签, 条目没有这个标签时保持不变.
   * @param entryIds 要摘标签的条目编号.
   * @param tagId 要摘掉的标签编号.
   * @returns 每个条目现在带的标签.
   */
  removeTag: (
    entryIds: readonly string[],
    tagId: string,
  ) => Promise<BatchResult<readonly EntryTagAssignment[]>>;
}
