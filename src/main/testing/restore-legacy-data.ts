import { eq } from "drizzle-orm";

import { insertAttachmentContent } from "../attachments/attachment-content-repository";
import { insertAttachmentRow } from "../attachments/attachment-repository";
import { insertEntry } from "../entries/entry-repository";
import { insertCustomEntryType } from "../entry-types/custom-entry-type-repository";
import { insertFolder } from "../folders/folder-repository";
import { replaceEntryTags } from "../tags/entry-tag-repository";
import { insertTag } from "../tags/tag-repository";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { emailBackupLastResults } from "../vault/database/email-backup-last-result-schema";

/**
 * 恢复前保险库里原有数据的编号, 与导出样本的编号都不同, 替换后它们必须全部消失.
 */
export const LEGACY_IDS = {
  folder: "old-folder",
  tag: "old-tag",
  customType: "old-type",
  entry: "old-entry",
  attachment: "old-attachment",
} as const;

/**
 * 上次邮箱备份结果里的时刻, 它不是备份内容, 恢复前后都应原样保留.
 */
export const LEGACY_LAST_RESULT_TIME = 123456;

/**
 * 写入原有数据里的文件夹, 标签与自定义类型.
 * @param orm 已解锁数据库的查询入口.
 */
function seedLegacyLabels(orm: VaultOrm): void {
  insertFolder(orm, { id: LEGACY_IDS.folder, name: "旧文件夹", createdAt: 5 });
  insertTag(orm, {
    id: LEGACY_IDS.tag,
    name: "旧标签",
    color: "green",
    createdAt: 5,
  });
  insertCustomEntryType(orm, {
    type: { id: LEGACY_IDS.customType, name: "旧类型", createdAt: 5 },
    fields: [
      {
        typeId: LEGACY_IDS.customType,
        key: "account",
        position: 0,
        name: "旧字段",
        kind: "singleLine",
        isSensitive: false,
      },
    ],
  });
}

/**
 * 写入原有数据里带标签与附件的条目, 以及一行不属于备份内容的上次邮箱备份结果.
 * @param orm 已解锁数据库的查询入口.
 */
function seedLegacyEntry(orm: VaultOrm): void {
  insertEntry(orm, {
    id: LEGACY_IDS.entry,
    name: "旧条目",
    type: "login",
    fields: { account: "old@example.com", password: "old-secret", url: "" },
    notes: "",
    notesFormat: "plain",
    customFields: [],
    totp: null,
    folderId: LEGACY_IDS.folder,
    createdAt: 5,
  });
  replaceEntryTags(orm, LEGACY_IDS.entry, [LEGACY_IDS.tag]);
  insertAttachmentRow(orm, {
    id: LEGACY_IDS.attachment,
    entryId: LEGACY_IDS.entry,
    name: "旧附件.txt",
    size: 3,
    position: 0,
  });
  insertAttachmentContent(orm, LEGACY_IDS.attachment, Buffer.from("old"));
  orm
    .insert(emailBackupLastResults)
    .values({
      id: 1,
      completedAt: LEGACY_LAST_RESULT_TIME,
      outcome: "success",
      reason: null,
      triggerKind: "manual",
      lastSuccessAt: LEGACY_LAST_RESULT_TIME,
    })
    .run();
}

/**
 * 在保险库里写入一份与导出样本互不相干的原有数据: 一个文件夹, 标签, 自定义类型, 带标签与附件
 * 的条目, 再加一行不属于备份内容的上次邮箱备份结果.
 * @param orm 已解锁数据库的查询入口.
 */
export function seedLegacyVaultContent(orm: VaultOrm): void {
  seedLegacyLabels(orm);
  seedLegacyEntry(orm);
}

/**
 * 读出上次邮箱备份结果里的完成时刻, 用来确认恢复没有碰这张不属于备份内容的表.
 * @param orm 已解锁数据库的查询入口.
 * @returns 完成时刻, 没有这一行时为 undefined.
 */
export function readLastResultTime(orm: VaultOrm): number | undefined {
  return orm
    .select({ completedAt: emailBackupLastResults.completedAt })
    .from(emailBackupLastResults)
    .where(eq(emailBackupLastResults.id, 1))
    .get()?.completedAt;
}
