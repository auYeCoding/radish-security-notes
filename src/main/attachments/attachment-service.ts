import {
  findCapacityViolation,
  findFileViolation,
  type AttachmentFileFacts,
} from "@shared/attachments/attachment-limits";
import {
  attachmentFailed,
  attachmentSucceeded,
  type AttachmentResult,
} from "@shared/attachments/attachment-result";
import type { AttachmentMeta } from "@shared/attachments/attachment-types";

import {
  runWithDatabase,
  type DatabaseAccess,
} from "../vault/database/database-access";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import {
  findAttachmentContent,
  insertAttachmentContent,
} from "./attachment-content-repository";
import {
  deleteAttachmentRow,
  findAttachment,
  insertAttachmentRow,
  isEntryExisting,
  listAttachmentsOfEntry,
  readEntryUsage,
  readNextPosition,
  toAttachmentMeta,
} from "./attachment-repository";

/**
 * 附件服务的依赖.
 */
export interface AttachmentServiceDependencies extends DatabaseAccess {
  /**
   * 生成新附件的唯一编号.
   */
  readonly createIdentifier: () => string;
}

/**
 * 一个已读入内存, 等待写库的附件文件.
 */
export interface AttachmentFile {
  /**
   * 附件名称, 即文件名.
   */
  readonly name: string;
  /**
   * 文件的全部字节.
   */
  readonly content: Buffer;
}

/**
 * 从库里读出的一个附件: 元数据与全部字节.
 */
export interface StoredAttachment {
  /**
   * 附件元数据.
   */
  readonly meta: AttachmentMeta;
  /**
   * 附件的全部字节.
   */
  readonly content: Buffer;
}

/**
 * 附件服务: 在已解锁的加密数据库里列出, 写入, 读出与删除条目的附件. 写入在一个数据库事务里完成,
 * 校验不通过时不写入, 写入中途出错时整个事务回滚, 所以失败时不会留下半条记录. 附件内容与文件名
 * 只在方法执行期间经过内存, 不写入日志. 对话框, 文件读写与临时副本由上层模块负责.
 */
export class AttachmentService {
  /**
   * 创建附件服务.
   * @param dependencies 服务依赖.
   */
  constructor(private readonly dependencies: AttachmentServiceDependencies) {}

  /**
   * 读取一个条目的全部附件元数据, 按添加顺序排列, 不读附件内容.
   * @param entryId 条目编号.
   * @returns 附件元数据列表, 未解锁或没有这个条目时为失败结果.
   */
  list(entryId: string): AttachmentResult<readonly AttachmentMeta[]> {
    return this.withDatabase((orm) =>
      isEntryExisting(orm, entryId)
        ? attachmentSucceeded(listAttachmentsOfEntry(orm, entryId))
        : attachmentFailed("not-found"),
    );
  }

  /**
   * 在读取文件内容之前检查条目加上这批文件后会不会超过个数或总大小上限, 用来挡掉过大的批次.
   * @param entryId 条目编号.
   * @param files 待添加文件的名称与字节数.
   * @returns 没有超限时为成功, 未解锁, 没有这个条目或超限时为失败结果.
   */
  checkCapacity(
    entryId: string,
    files: readonly AttachmentFileFacts[],
  ): AttachmentResult<undefined> {
    return this.withDatabase((orm) => {
      if (!isEntryExisting(orm, entryId)) {
        return attachmentFailed("not-found");
      }
      const violation = findCapacityViolation(
        readEntryUsage(orm, entryId),
        files,
      );
      return violation === undefined
        ? attachmentSucceeded(undefined)
        : attachmentFailed(violation);
    });
  }

  /**
   * 把一批文件添加为条目的附件: 在一个事务里复核每个文件的大小与条目的个数, 总大小上限, 再写入
   * 全部元数据与内容, 顺序接在条目现有附件之后. 任何一项不合规或写入出错时整批都不写入.
   * @param entryId 条目编号.
   * @param files 已读入内存的文件, 按添加顺序排列.
   * @returns 新增附件的元数据, 未解锁, 没有这个条目, 没有文件, 有文件为空或过大, 超过个数或总大小
   * 上限, 或数据库出错时为失败结果.
   */
  insertAll(
    entryId: string,
    files: readonly AttachmentFile[],
  ): AttachmentResult<readonly AttachmentMeta[]> {
    return this.inTransaction((orm) => {
      if (files.length === 0) {
        return attachmentFailed("invalid-input");
      }
      if (!isEntryExisting(orm, entryId)) {
        return attachmentFailed("not-found");
      }
      const facts = files.map((file) => ({
        name: file.name,
        size: file.content.length,
      }));
      const fileViolation = findFileViolation(facts);
      if (fileViolation !== undefined) {
        return attachmentFailed(fileViolation.reason, fileViolation.fileName);
      }
      const capacityViolation = findCapacityViolation(
        readEntryUsage(orm, entryId),
        facts,
      );
      if (capacityViolation !== undefined) {
        return attachmentFailed(capacityViolation);
      }
      return attachmentSucceeded(this.writeFiles(orm, entryId, files));
    });
  }

  /**
   * 读出一个附件的元数据, 不读内容, 用来在读取内容之前判断能否预览, 打开或另存为.
   * @param attachmentId 附件编号.
   * @returns 附件元数据, 未解锁或没有这个编号时为失败结果.
   */
  findMeta(attachmentId: string): AttachmentResult<AttachmentMeta> {
    return this.withDatabase((orm) => {
      const row = findAttachment(orm, attachmentId);
      return row === undefined
        ? attachmentFailed("not-found")
        : attachmentSucceeded(toAttachmentMeta(row));
    });
  }

  /**
   * 读出一个附件的元数据与全部字节.
   * @param attachmentId 附件编号.
   * @returns 附件, 未解锁或没有这个编号时为失败结果.
   */
  read(attachmentId: string): AttachmentResult<StoredAttachment> {
    return this.withDatabase((orm) => {
      const row = findAttachment(orm, attachmentId);
      const content =
        row === undefined ? undefined : findAttachmentContent(orm, row.id);
      return row === undefined || content === undefined
        ? attachmentFailed("not-found")
        : attachmentSucceeded({ meta: toAttachmentMeta(row), content });
    });
  }

  /**
   * 删除一个附件, 元数据行在一个事务里删除, 内容行随外键级联删除.
   * @param attachmentId 附件编号.
   * @returns 删除结果, 未解锁或没有这个编号时为失败结果.
   */
  remove(attachmentId: string): AttachmentResult<undefined> {
    return this.inTransaction((orm) =>
      deleteAttachmentRow(orm, attachmentId)
        ? attachmentSucceeded(undefined)
        : attachmentFailed("not-found"),
    );
  }

  /**
   * 写入一批文件的元数据与内容, 调用方要把它放在事务里, 并先完成全部校验.
   * @param orm 已解锁数据库的事务.
   * @param entryId 条目编号.
   * @param files 要写入的文件.
   * @returns 新增附件的元数据, 顺序与文件一致.
   */
  private writeFiles(
    orm: VaultOrm,
    entryId: string,
    files: readonly AttachmentFile[],
  ): readonly AttachmentMeta[] {
    const firstPosition = readNextPosition(orm, entryId);
    return files.map((file, index) => {
      const row = {
        id: this.dependencies.createIdentifier(),
        entryId,
        name: file.name,
        size: file.content.length,
        position: firstPosition + index,
      };
      insertAttachmentRow(orm, row);
      insertAttachmentContent(orm, row.id, file.content);
      return toAttachmentMeta(row);
    });
  }

  /**
   * 在已解锁的数据库上执行一个操作, 未解锁与意外失败的处理见 `runWithDatabase`.
   * @param operation 要执行的操作.
   * @returns 操作结果.
   */
  private withDatabase<Value>(
    operation: (orm: VaultOrm) => AttachmentResult<Value>,
  ): AttachmentResult<Value> {
    return runWithDatabase(this.dependencies, operation);
  }

  /**
   * 在已解锁数据库的一个事务里执行一个操作. 操作返回失败结果时事务不写入任何内容, 操作抛出错误
   * 时事务回滚, 未解锁与意外失败的处理见 `runWithDatabase`.
   * @param operation 要执行的操作, 参数是事务.
   * @returns 操作结果.
   */
  private inTransaction<Value>(
    operation: (orm: VaultOrm) => AttachmentResult<Value>,
  ): AttachmentResult<Value> {
    return runWithDatabase(this.dependencies, (orm) =>
      orm.transaction((transaction) => operation(transaction)),
    );
  }
}
