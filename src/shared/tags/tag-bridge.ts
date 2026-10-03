import type { TagColorKey } from "./tag-colors";
import type { TagResult } from "./tag-result";
import type { TagSummary } from "./tag-types";

/**
 * preload 暴露给渲染进程的标签接口, 渲染进程只经它读取, 新建, 编辑与删除标签. 给条目打标签
 * 经条目桥的新建与更新完成.
 */
export interface TagBridge {
  /**
   * 读取全部标签, 先创建的在前.
   * @returns 标签摘要列表.
   */
  list: () => Promise<TagResult<readonly TagSummary[]>>;
  /**
   * 新建一个标签.
   * @param name 用户填写的名称.
   * @param color 调色板里的颜色键.
   * @returns 新建的标签摘要.
   */
  create: (name: string, color: TagColorKey) => Promise<TagResult<TagSummary>>;
  /**
   * 编辑一个标签的名称与颜色.
   * @param id 标签编号.
   * @param name 用户填写的新名称.
   * @param color 调色板里的颜色键.
   * @returns 编辑后的标签摘要.
   */
  update: (
    id: string,
    name: string,
    color: TagColorKey,
  ) => Promise<TagResult<TagSummary>>;
  /**
   * 删除一个标签, 条目上的这个标签随之摘掉, 条目本身不删除.
   * @param id 标签编号.
   * @returns 删除结果.
   */
  remove: (id: string) => Promise<TagResult<undefined>>;
}
