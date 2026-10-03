import type { FolderResult } from "./folder-result";
import type { FolderSummary } from "./folder-types";

/**
 * preload 暴露给渲染进程的文件夹接口, 渲染进程只经它读取, 新建, 重命名与删除文件夹, 并把条目放进
 * 文件夹.
 */
export interface FolderBridge {
  /**
   * 读取全部文件夹, 先创建的在前.
   * @returns 文件夹摘要列表.
   */
  list: () => Promise<FolderResult<readonly FolderSummary[]>>;
  /**
   * 新建一个文件夹.
   * @param name 用户填写的名称.
   * @returns 新建的文件夹摘要.
   */
  create: (name: string) => Promise<FolderResult<FolderSummary>>;
  /**
   * 重命名一个文件夹.
   * @param id 文件夹编号.
   * @param name 用户填写的新名称.
   * @returns 重命名后的文件夹摘要.
   */
  rename: (id: string, name: string) => Promise<FolderResult<FolderSummary>>;
  /**
   * 删除一个文件夹, 其中的条目全部移到未分类, 条目本身不删除.
   * @param id 文件夹编号.
   * @returns 删除结果.
   */
  remove: (id: string) => Promise<FolderResult<undefined>>;
  /**
   * 把一个条目放进文件夹, 或移出文件夹回到未分类.
   * @param entryId 条目编号.
   * @param folderId 目标文件夹编号, 未分类时为 undefined.
   * @returns 放入结果.
   */
  assignEntry: (
    entryId: string,
    folderId: string | undefined,
  ) => Promise<FolderResult<undefined>>;
}
