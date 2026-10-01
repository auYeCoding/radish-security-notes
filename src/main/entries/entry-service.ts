import {
  entryFailed,
  entrySucceeded,
  type EntryResult,
} from "@shared/entries/entry-result";
import type {
  EntryCopyField,
  EntryDetail,
  EntrySummary,
  NewEntryInput,
} from "@shared/entries/entry-types";
import { newEntrySchema } from "@shared/entries/new-entry-schema";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import type { ClipboardPort } from "./clipboard-port";
import {
  findEntry,
  insertEntry,
  listEntrySummaries,
  type EntryRecord,
} from "./entry-repository";

/**
 * 条目服务的依赖.
 */
export interface EntryServiceDependencies {
  /**
   * 取已解锁数据库的查询入口, 未解锁时返回 undefined.
   */
  readonly getOrm: () => VaultOrm | undefined;
  /**
   * 系统剪贴板.
   */
  readonly clipboard: ClipboardPort;
  /**
   * 生成新条目的唯一编号.
   */
  readonly createIdentifier: () => string;
  /**
   * 读取当前时间的毫秒时间戳.
   */
  readonly now: () => number;
  /**
   * 操作意外失败时的回调, 参数是底层错误.
   */
  readonly onFailure: (error: unknown) => void;
}

/**
 * 把表里的一行转成条目详情.
 * @param record 条目所在的行.
 * @returns 条目详情.
 */
function toDetail(record: EntryRecord): EntryDetail {
  return {
    id: record.id,
    name: record.name,
    account: record.account,
    password: record.password,
  };
}

/**
 * 条目服务: 在已解锁的加密数据库里新建与读取条目, 并把条目字段复制到剪贴板. 账号与密码
 * 只在方法执行期间经过内存, 不写入日志.
 */
export class EntryService {
  /**
   * 创建条目服务.
   * @param dependencies 服务依赖.
   */
  constructor(private readonly dependencies: EntryServiceDependencies) {}

  /**
   * 读取全部条目的摘要, 最新创建的在最前.
   * @returns 摘要列表, 未解锁时为失败结果.
   */
  list(): EntryResult<readonly EntrySummary[]> {
    return this.withDatabase((orm) => entrySucceeded(listEntrySummaries(orm)));
  }

  /**
   * 读取一个条目的详情.
   * @param id 条目编号.
   * @returns 条目详情, 未解锁或没有这个编号时为失败结果.
   */
  get(id: string): EntryResult<EntryDetail> {
    return this.withDatabase((orm) => {
      const record = findEntry(orm, id);
      return record === undefined
        ? entryFailed("not-found")
        : entrySucceeded(toDetail(record));
    });
  }

  /**
   * 新建一个条目: 校验输入, 名称去首尾空格, 生成编号与创建时间后写入数据库.
   * @param input 用户填写的名称, 账号与密码.
   * @returns 新建的条目详情, 未解锁或输入不合规时为失败结果.
   */
  create(input: NewEntryInput): EntryResult<EntryDetail> {
    return this.withDatabase((orm) => {
      const parsed = newEntrySchema.safeParse(input);
      if (!parsed.success) {
        return entryFailed("invalid-input");
      }
      const record: EntryRecord = {
        id: this.dependencies.createIdentifier(),
        ...parsed.data,
        createdAt: this.dependencies.now(),
      };
      insertEntry(orm, record);
      return entrySucceeded(toDetail(record));
    });
  }

  /**
   * 把条目的一个字段写入系统剪贴板.
   * @param id 条目编号.
   * @param field 要复制的字段.
   * @returns 复制结果, 未解锁或没有这个编号时为失败结果.
   */
  copyField(id: string, field: EntryCopyField): EntryResult<undefined> {
    return this.withDatabase((orm) => {
      const record = findEntry(orm, id);
      if (record === undefined) {
        return entryFailed("not-found");
      }
      this.dependencies.clipboard.writeText(record[field]);
      return entrySucceeded(undefined);
    });
  }

  /**
   * 在已解锁的数据库上执行一个操作. 未解锁时返回失败结果; 操作抛出错误时通知回调,
   * 并返回意外错误的失败结果.
   * @param operation 要执行的操作.
   * @returns 操作结果.
   */
  private withDatabase<Value>(
    operation: (orm: VaultOrm) => EntryResult<Value>,
  ): EntryResult<Value> {
    const orm = this.dependencies.getOrm();
    if (orm === undefined) {
      return entryFailed("vault-locked");
    }
    try {
      return operation(orm);
    } catch (error) {
      this.dependencies.onFailure(error);
      return entryFailed("unexpected-error");
    }
  }
}
