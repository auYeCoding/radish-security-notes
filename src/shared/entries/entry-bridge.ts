import type { EntryResult } from "./entry-result";
import type {
  EntryCopyField,
  EntryDetail,
  EntrySummary,
  NewEntryInput,
} from "./entry-types";

/**
 * preload 暴露给渲染进程的条目接口, 渲染进程只经它读写条目与复制字段.
 */
export interface EntryBridge {
  /**
   * 读取全部条目的摘要, 最新创建的在最前.
   * @returns 摘要列表.
   */
  list: () => Promise<EntryResult<readonly EntrySummary[]>>;
  /**
   * 读取一个条目的详情.
   * @param id 条目编号.
   * @returns 条目详情.
   */
  get: (id: string) => Promise<EntryResult<EntryDetail>>;
  /**
   * 新建一个条目.
   * @param input 用户填写的名称, 账号与密码.
   * @returns 新建的条目详情.
   */
  create: (input: NewEntryInput) => Promise<EntryResult<EntryDetail>>;
  /**
   * 让主进程把条目的一个字段写入系统剪贴板, 字段值不经过渲染进程.
   * @param id 条目编号.
   * @param field 要复制的字段.
   * @returns 复制结果.
   */
  copyField: (
    id: string,
    field: EntryCopyField,
  ) => Promise<EntryResult<undefined>>;
}
