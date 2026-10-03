import { isSameFolderName } from "@shared/folders/folder-name-match";
import { createFolderNameSchema } from "@shared/folders/folder-name-schema";
import {
  folderFailed,
  folderSucceeded,
  type FolderResult,
} from "@shared/folders/folder-result";
import type { FolderSummary } from "@shared/folders/folder-types";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import {
  runWithFolderDatabase,
  type FolderDatabaseAccess,
} from "./folder-database-access";
import {
  deleteFolderKeepingEntries,
  findFolder,
  insertFolder,
  listFolders,
  renameFolder,
  setEntryFolder,
  type FolderRecord,
} from "./folder-repository";

/**
 * 文件夹服务的依赖.
 */
export interface FolderServiceDependencies extends FolderDatabaseAccess {
  /**
   * 生成新文件夹的唯一编号.
   */
  readonly createIdentifier: () => string;
  /**
   * 读取当前时间的毫秒时间戳.
   */
  readonly now: () => number;
}

/**
 * 把表里的一行转成文件夹摘要.
 * @param record 文件夹所在的行.
 * @returns 文件夹摘要.
 */
function toSummary(record: FolderRecord): FolderSummary {
  return { id: record.id, name: record.name };
}

/**
 * 校验用户填写的文件夹名称并去掉首尾空格.
 * @param name 用户填写的名称.
 * @returns 校验通过的名称, 不合规时为 undefined.
 */
function parseFolderName(name: string): string | undefined {
  const parsed = createFolderNameSchema().safeParse({ name });
  return parsed.success ? parsed.data.name : undefined;
}

/**
 * 判断名称是否与别的文件夹重名.
 * @param orm 已解锁数据库的查询入口.
 * @param name 已校验的名称.
 * @param ownIdentifier 重命名时自己的编号, 新建时为 undefined.
 * @returns 与别的文件夹重名时返回 true.
 */
function isNameTaken(
  orm: VaultOrm,
  name: string,
  ownIdentifier: string | undefined,
): boolean {
  return listFolders(orm).some(
    (record) =>
      record.id !== ownIdentifier && isSameFolderName(record.name, name),
  );
}

/**
 * 文件夹服务: 在已解锁的加密数据库里新建, 重命名, 删除与列出文件夹, 并把条目放进文件夹.
 * 文件夹名称只在方法执行期间经过内存, 不写入日志.
 */
export class FolderService {
  /**
   * 创建文件夹服务.
   * @param dependencies 服务依赖.
   */
  constructor(private readonly dependencies: FolderServiceDependencies) {}

  /**
   * 读取全部文件夹, 先创建的在前.
   * @returns 文件夹摘要列表, 未解锁时为失败结果.
   */
  list(): FolderResult<readonly FolderSummary[]> {
    return this.withDatabase((orm) =>
      folderSucceeded(listFolders(orm).map(toSummary)),
    );
  }

  /**
   * 新建一个文件夹: 名称去首尾空格, 校验长度并拒绝与已有文件夹重名, 生成编号与创建时间后写入.
   * @param name 用户填写的名称.
   * @returns 新建的文件夹摘要, 未解锁, 名称不合规或重名时为失败结果.
   */
  create(name: string): FolderResult<FolderSummary> {
    return this.withDatabase((orm) => {
      const parsedName = parseFolderName(name);
      if (parsedName === undefined) {
        return folderFailed("invalid-input");
      }
      if (isNameTaken(orm, parsedName, undefined)) {
        return folderFailed("name-taken");
      }
      const record: FolderRecord = {
        id: this.dependencies.createIdentifier(),
        name: parsedName,
        createdAt: this.dependencies.now(),
      };
      insertFolder(orm, record);
      return folderSucceeded(toSummary(record));
    });
  }

  /**
   * 重命名一个文件夹: 规则与新建一致, 与自己同名 (只改了大小写或空格) 不算重名.
   * @param id 文件夹编号.
   * @param name 用户填写的新名称.
   * @returns 重命名后的文件夹摘要, 未解锁, 没有这个编号, 名称不合规或重名时为失败结果.
   */
  rename(id: string, name: string): FolderResult<FolderSummary> {
    return this.withDatabase((orm) => {
      if (findFolder(orm, id) === undefined) {
        return folderFailed("not-found");
      }
      const parsedName = parseFolderName(name);
      if (parsedName === undefined) {
        return folderFailed("invalid-input");
      }
      if (isNameTaken(orm, parsedName, id)) {
        return folderFailed("name-taken");
      }
      renameFolder(orm, id, parsedName);
      return folderSucceeded({ id, name: parsedName });
    });
  }

  /**
   * 删除一个文件夹, 其中的条目全部移到未分类, 条目本身不删除.
   * @param id 文件夹编号.
   * @returns 删除结果, 未解锁或没有这个编号时为失败结果.
   */
  remove(id: string): FolderResult<undefined> {
    return this.withDatabase((orm) =>
      deleteFolderKeepingEntries(orm, id)
        ? folderSucceeded(undefined)
        : folderFailed("not-found"),
    );
  }

  /**
   * 把一个条目放进文件夹, 或移出文件夹回到未分类.
   * @param entryId 条目编号.
   * @param folderId 目标文件夹编号, 未分类时为 undefined.
   * @returns 放入结果, 未解锁, 没有这个条目或目标文件夹不存在时为失败结果.
   */
  assignEntry(
    entryId: string,
    folderId: string | undefined,
  ): FolderResult<undefined> {
    return this.withDatabase((orm) => {
      if (folderId !== undefined && findFolder(orm, folderId) === undefined) {
        return folderFailed("not-found");
      }
      return setEntryFolder(orm, entryId, folderId ?? null)
        ? folderSucceeded(undefined)
        : folderFailed("not-found");
    });
  }

  /**
   * 在已解锁的数据库上执行一个操作, 未解锁与意外失败的处理见 `runWithFolderDatabase`.
   * @param operation 要执行的操作.
   * @returns 操作结果.
   */
  private withDatabase<Value>(
    operation: (orm: VaultOrm) => FolderResult<Value>,
  ): FolderResult<Value> {
    return runWithFolderDatabase(this.dependencies, operation);
  }
}
