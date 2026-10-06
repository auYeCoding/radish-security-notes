import {
  restoreFailed,
  restoreSucceeded,
  type RestoreResult,
} from "@shared/restore/restore-result";
import type { RestoreOutcome } from "@shared/restore/restore-types";

import { insertAttachmentContent } from "../attachments/attachment-content-repository";
import { insertAttachmentRow } from "../attachments/attachment-repository";
import { insertEntry } from "../entries/entry-repository";
import { insertCustomEntryType } from "../entry-types/custom-entry-type-repository";
import { insertFolder } from "../folders/folder-repository";
import { replaceEntryTags } from "../tags/entry-tag-repository";
import { insertTag } from "../tags/tag-repository";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import type { ValidatedBackup } from "./restore-backup-types";
import {
  toAttachmentRow,
  toCustomTypeRows,
  toEntryRecord,
  toFolderRecord,
  toTagRecord,
} from "./restore-record-mapper";
import { clearVaultContent } from "./vault-content-clearer";
import { readVaultState } from "./vault-content-counter";

/**
 * 写入恢复用到的依赖.
 */
export interface RestoreWriterDependencies {
  /**
   * 读取当前时间的毫秒时间戳, 备份格式里没有的文件夹, 标签, 自定义类型创建时间取它.
   */
  readonly now: () => number;
}

/**
 * 写入恢复的请求.
 */
export interface RestoreWriteRequest {
  /**
   * 校验后的备份.
   */
  readonly backup: ValidatedBackup;
  /**
   * 用户是否已确认清空现有数据后整体替换.
   */
  readonly acknowledgesReplace: boolean;
}

/**
 * 在事务里写入备份里的文件夹, 标签与自定义类型, 按备份里的顺序插入, 创建时间相同时查询按插入
 * 顺序排列, 先后顺序因此保持.
 * @param orm 事务.
 * @param backup 校验后的备份.
 * @param createdAt 统一的创建时间.
 */
function writeLabels(
  orm: VaultOrm,
  backup: ValidatedBackup,
  createdAt: number,
): void {
  const { document } = backup;
  document.folders.forEach((folder) =>
    insertFolder(orm, toFolderRecord(folder, createdAt)),
  );
  document.tags.forEach((tag) => insertTag(orm, toTagRecord(tag, createdAt)));
  document.customEntryTypes.forEach((type) =>
    insertCustomEntryType(orm, toCustomTypeRows(type, createdAt)),
  );
}

/**
 * 在事务里写入备份里的条目, 连同每个条目的标签关联与附件元数据和内容.
 * @param orm 事务.
 * @param backup 校验后的备份.
 * @throws Error 当声明的附件没有内容时, 校验保证不会发生.
 */
function writeEntries(orm: VaultOrm, backup: ValidatedBackup): void {
  for (const entry of backup.document.entries) {
    insertEntry(orm, toEntryRecord(entry));
    if (entry.tagIds.length > 0) {
      replaceEntryTags(orm, entry.id, entry.tagIds);
    }
    for (const attachment of entry.attachments) {
      const content = backup.attachments.get(attachment.id);
      if (content === undefined) {
        throw new Error("附件声明没有对应的内容");
      }
      insertAttachmentRow(orm, toAttachmentRow(attachment, entry.id));
      insertAttachmentContent(orm, attachment.id, content);
    }
  }
}

/**
 * 把备份写进保险库, 全部在一个数据库事务里完成: 先在事务内判断保险库是否为空, 非空且用户没有
 * 确认替换就拒绝; 非空且已确认就先清空; 然后写入文件夹, 标签, 自定义类型与条目. 任何一步抛出
 * 错误整个事务回滚, 库里不留下半成功的状态, 清空也一并撤销. 备份里的编号原样写入, 数据按当前
 * 保险库打开的加密数据库保存.
 * @param orm 已解锁数据库的查询入口.
 * @param request 校验后的备份与替换确认.
 * @param dependencies 时间依赖.
 * @returns 恢复概况; 保险库非空却没有确认替换时为失败结果.
 */
export function writeRestore(
  orm: VaultOrm,
  request: RestoreWriteRequest,
  dependencies: RestoreWriterDependencies,
): RestoreResult<RestoreOutcome> {
  return orm.transaction((transaction) => {
    const isReplacing = !readVaultState(transaction).isEmpty;
    if (isReplacing && !request.acknowledgesReplace) {
      return restoreFailed("replace-not-acknowledged");
    }
    if (isReplacing) {
      clearVaultContent(transaction);
    }
    const { backup } = request;
    writeLabels(transaction, backup, dependencies.now());
    writeEntries(transaction, backup);
    return restoreSucceeded({
      entryCount: backup.document.entries.length,
      folderCount: backup.document.folders.length,
      tagCount: backup.document.tags.length,
      customTypeCount: backup.document.customEntryTypes.length,
      attachmentCount: backup.attachments.size,
      replacedExistingData: isReplacing,
    });
  });
}
