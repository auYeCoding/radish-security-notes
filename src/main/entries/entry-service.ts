import { createEditEntrySchema } from "@shared/entries/edit-entry-schema";
import {
  entryFailed,
  entrySucceeded,
  type EntryResult,
} from "@shared/entries/entry-result";
import {
  readAccount,
  type EntryDetail,
  type EntrySummary,
  type NewEntryInput,
  type UpdateEntryInput,
} from "@shared/entries/entry-types";
import { createNewEntrySchema } from "@shared/entries/new-entry-schema";
import {
  findEntryType,
  requireEntryType,
} from "@shared/entries/preset-entry-types";

import { isFolderChoiceValid } from "../folders/folder-repository";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import type { ClipboardPort } from "./clipboard-port";
import { findCustomField } from "./custom-field-records";
import {
  runWithEntryDatabase,
  type EntryDatabaseAccess,
} from "./entry-database-access";
import { findCopyValue, normalizeFieldValues } from "./entry-field-values";
import { buildEntryRecord } from "./entry-record-builder";
import {
  deleteEntry,
  findEntry,
  insertEntry,
  listEntrySummaries,
  updateEntry,
  type EntryRecord,
} from "./entry-repository";
import { buildUpdatedRecord } from "./entry-update-builder";

/**
 * 条目服务的依赖.
 */
export interface EntryServiceDependencies extends EntryDatabaseAccess {
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
}

/**
 * 把表里的一行转成条目详情, 类型字段按类型补全.
 * @param record 条目所在的行.
 * @returns 条目详情.
 * @throws Error 当行里的类型不是预设类型时.
 */
function toDetail(record: EntryRecord): EntryDetail {
  const type = requireEntryType(record.type);
  const fields = normalizeFieldValues(type, record.fields);
  return {
    id: record.id,
    name: record.name,
    type: type.key,
    account: readAccount(fields),
    fields,
    notes: record.notes,
    customFields: record.customFields,
    hasTotp: record.totp !== null,
    folderId: record.folderId ?? undefined,
  };
}

/**
 * 条目服务: 在已解锁的加密数据库里新建, 读取, 更新与删除条目, 并把条目字段复制到剪贴板.
 * 类型字段, 备注与自定义字段只在方法执行期间经过内存, 不写入日志.
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
   * 新建一个条目: 按类型校验输入, 名称与自定义字段的字段名去首尾空格, 生成条目编号, 自定义
   * 字段编号与创建时间后写入数据库. 选了所属文件夹时, 文件夹必须存在.
   * @param input 用户选的类型, 填写的名称, 类型字段, 备注, 自定义字段与所属文件夹.
   * @returns 新建的条目详情, 未解锁, 输入不合规 (含未知类型) 或所选文件夹不存在时为失败结果.
   */
  create(input: NewEntryInput): EntryResult<EntryDetail> {
    return this.withDatabase((orm) => {
      const type = findEntryType(input.type);
      const parsed =
        type === undefined
          ? undefined
          : createNewEntrySchema(type).safeParse(input);
      if (type === undefined || !parsed?.success) {
        return entryFailed("invalid-input");
      }
      if (!isFolderChoiceValid(orm, parsed.data.folderId)) {
        return entryFailed("folder-not-found");
      }
      const record = buildEntryRecord({
        type,
        values: parsed.data,
        createIdentifier: this.dependencies.createIdentifier,
        createdAt: this.dependencies.now(),
      });
      insertEntry(orm, record);
      return entrySucceeded(toDetail(record));
    });
  }

  /**
   * 更新一个条目: 按条目已保存的类型校验输入, 名称与自定义字段的字段名去首尾空格, 自定义字段
   * 重新分配编号后写回数据库. 条目的编号, 类型与创建时间不变, 所属文件夹以输入为准, 省略表示
   * 未分类, 选了文件夹时文件夹必须存在.
   * @param id 条目编号.
   * @param input 用户填写的名称, 类型字段, 备注, 自定义字段, TOTP 的处理方式与所属文件夹.
   * @returns 更新后的条目详情, 未解锁, 没有这个编号, 输入不合规或所选文件夹不存在时为失败结果.
   */
  update(id: string, input: UpdateEntryInput): EntryResult<EntryDetail> {
    return this.withDatabase((orm) => {
      const existing = findEntry(orm, id);
      if (existing === undefined) {
        return entryFailed("not-found");
      }
      const type = findEntryType(existing.type);
      const parsed =
        type === undefined
          ? undefined
          : createEditEntrySchema(type).safeParse(input);
      if (!parsed?.success) {
        return entryFailed("invalid-input");
      }
      if (!isFolderChoiceValid(orm, parsed.data.folderId)) {
        return entryFailed("folder-not-found");
      }
      const record = buildUpdatedRecord({
        existing,
        values: parsed.data,
        createIdentifier: this.dependencies.createIdentifier,
      });
      updateEntry(orm, record);
      return entrySucceeded(toDetail(record));
    });
  }

  /**
   * 删除一个条目, 记录从加密数据库里移除.
   * @param id 条目编号.
   * @returns 删除结果, 未解锁或没有这个编号时为失败结果.
   */
  remove(id: string): EntryResult<undefined> {
    return this.withDatabase((orm) =>
      deleteEntry(orm, id)
        ? entrySucceeded(undefined)
        : entryFailed("not-found"),
    );
  }

  /**
   * 把条目的一个字段写入系统剪贴板.
   * @param id 条目编号.
   * @param field 要复制的字段名, 是备注或条目类型里的字段键.
   * @returns 复制结果, 未解锁, 没有这个编号或条目类型没有这个字段时为失败结果.
   */
  copyField(id: string, field: string): EntryResult<undefined> {
    return this.withDatabase((orm) => {
      const record = findEntry(orm, id);
      const value =
        record === undefined ? undefined : findCopyValue(record, field);
      if (value === undefined) {
        return entryFailed("not-found");
      }
      this.dependencies.clipboard.writeText(value);
      return entrySucceeded(undefined);
    });
  }

  /**
   * 把条目的一个自定义字段的值写入系统剪贴板.
   * @param id 条目编号.
   * @param customFieldId 自定义字段编号.
   * @returns 复制结果, 未解锁, 没有这个条目或没有这个字段时为失败结果.
   */
  copyCustomField(id: string, customFieldId: string): EntryResult<undefined> {
    return this.withDatabase((orm) => {
      const record = findEntry(orm, id);
      const field =
        record === undefined
          ? undefined
          : findCustomField(record.customFields, customFieldId);
      if (field === undefined) {
        return entryFailed("not-found");
      }
      this.dependencies.clipboard.writeText(field.value);
      return entrySucceeded(undefined);
    });
  }

  /**
   * 在已解锁的数据库上执行一个操作, 未解锁与意外失败的处理见 `runWithEntryDatabase`.
   * @param operation 要执行的操作.
   * @returns 操作结果.
   */
  private withDatabase<Value>(
    operation: (orm: VaultOrm) => EntryResult<Value>,
  ): EntryResult<Value> {
    return runWithEntryDatabase(this.dependencies, operation);
  }
}
