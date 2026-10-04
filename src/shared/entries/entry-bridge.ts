import type { EntrySearchHit } from "../search/entry-search-types";
import type { EntryResult } from "./entry-result";
import type {
  EntryDetail,
  EntrySummary,
  NewEntryInput,
  UpdateEntryInput,
} from "./entry-types";

/**
 * preload 暴露给渲染进程的条目接口, 渲染进程只经它读写, 删除条目与复制字段.
 */
export interface EntryBridge {
  /**
   * 读取全部条目的摘要, 最新创建的在最前.
   * @returns 摘要列表.
   */
  list: () => Promise<EntryResult<readonly EntrySummary[]>>;
  /**
   * 在全部条目里搜索, 字段内容留在主进程, 渲染进程只拿到命中的条目编号与命中的字段名.
   * @param query 搜索栏里的关键字.
   * @returns 命中列表.
   */
  search: (query: string) => Promise<EntryResult<readonly EntrySearchHit[]>>;
  /**
   * 读取一个条目的详情.
   * @param id 条目编号.
   * @returns 条目详情.
   */
  get: (id: string) => Promise<EntryResult<EntryDetail>>;
  /**
   * 新建一个条目.
   * @param input 用户选的类型, 填写的名称, 类型字段, 备注与自定义字段.
   * @returns 新建的条目详情.
   */
  create: (input: NewEntryInput) => Promise<EntryResult<EntryDetail>>;
  /**
   * 更新一个条目, 条目的类型不变.
   * @param id 条目编号.
   * @param input 用户填写的名称, 类型字段, 备注, 自定义字段与 TOTP 的处理方式.
   * @returns 更新后的条目详情.
   */
  update: (
    id: string,
    input: UpdateEntryInput,
  ) => Promise<EntryResult<EntryDetail>>;
  /**
   * 删除一个条目, 记录从加密数据库里移除.
   * @param id 条目编号.
   * @returns 删除结果.
   */
  remove: (id: string) => Promise<EntryResult<undefined>>;
  /**
   * 让主进程把条目的一个字段写入系统剪贴板, 字段值不经过渲染进程.
   * @param id 条目编号.
   * @param field 要复制的字段名, 是备注或条目类型里的字段键.
   * @returns 复制结果.
   */
  copyField: (id: string, field: string) => Promise<EntryResult<undefined>>;
  /**
   * 让主进程把条目的一个自定义字段的值写入系统剪贴板, 字段值不经过渲染进程.
   * @param id 条目编号.
   * @param customFieldId 自定义字段编号.
   * @returns 复制结果.
   */
  copyCustomField: (
    id: string,
    customFieldId: string,
  ) => Promise<EntryResult<undefined>>;
}
