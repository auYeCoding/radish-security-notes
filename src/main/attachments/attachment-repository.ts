import { asc, eq, sql } from "drizzle-orm";

import type { EntryAttachmentUsage } from "@shared/attachments/attachment-limits";
import type { AttachmentMeta } from "@shared/attachments/attachment-types";

import { entryAttachments } from "../vault/database/attachment-schema";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { entries } from "../vault/database/entry-schema";

/**
 * 附件元数据表里的一行.
 */
export type AttachmentRow = typeof entryAttachments.$inferSelect;

/**
 * 把表里的一行转成附件元数据.
 * @param row 附件元数据所在的行.
 * @returns 附件元数据.
 */
export function toAttachmentMeta(row: AttachmentRow): AttachmentMeta {
  return { id: row.id, name: row.name, size: row.size };
}

/**
 * 判断条目是否存在.
 * @param orm 已解锁数据库的查询入口或事务.
 * @param entryId 条目编号.
 * @returns 条目存在时为 true.
 */
export function isEntryExisting(orm: VaultOrm, entryId: string): boolean {
  return (
    orm
      .select({ id: entries.id })
      .from(entries)
      .where(eq(entries.id, entryId))
      .get() !== undefined
  );
}

/**
 * 读取一个条目的全部附件元数据, 按添加顺序排列.
 * @param orm 已解锁数据库的查询入口或事务.
 * @param entryId 条目编号.
 * @returns 附件元数据列表.
 */
export function listAttachmentsOfEntry(
  orm: VaultOrm,
  entryId: string,
): AttachmentMeta[] {
  return orm
    .select()
    .from(entryAttachments)
    .where(eq(entryAttachments.entryId, entryId))
    .orderBy(asc(entryAttachments.position))
    .all()
    .map(toAttachmentMeta);
}

/**
 * 按编号读取一个附件的元数据行.
 * @param orm 已解锁数据库的查询入口或事务.
 * @param attachmentId 附件编号.
 * @returns 附件元数据所在的行, 没有这个编号时为 undefined.
 */
export function findAttachment(
  orm: VaultOrm,
  attachmentId: string,
): AttachmentRow | undefined {
  return orm
    .select()
    .from(entryAttachments)
    .where(eq(entryAttachments.id, attachmentId))
    .get();
}

/**
 * 读取一个条目上已有附件的个数与总字节数, 只查元数据表.
 * @param orm 已解锁数据库的查询入口或事务.
 * @param entryId 条目编号.
 * @returns 已有附件的用量, 没有附件时个数与字节数都是 0.
 */
export function readEntryUsage(
  orm: VaultOrm,
  entryId: string,
): EntryAttachmentUsage {
  const row = orm
    .select({
      count: sql<number>`count(*)`,
      totalBytes: sql<number>`coalesce(sum(${entryAttachments.size}), 0)`,
    })
    .from(entryAttachments)
    .where(eq(entryAttachments.entryId, entryId))
    .get();
  return { count: row?.count ?? 0, totalBytes: row?.totalBytes ?? 0 };
}

/**
 * 读取下一个附件在条目上应占的添加顺序号: 现有最大顺序号加一, 没有附件时为 0.
 * @param orm 已解锁数据库的查询入口或事务.
 * @param entryId 条目编号.
 * @returns 下一个顺序号.
 */
export function readNextPosition(orm: VaultOrm, entryId: string): number {
  const row = orm
    .select({
      next: sql<number>`coalesce(max(${entryAttachments.position}), -1) + 1`,
    })
    .from(entryAttachments)
    .where(eq(entryAttachments.entryId, entryId))
    .get();
  return row?.next ?? 0;
}

/**
 * 插入一个附件的元数据行.
 * @param orm 已解锁数据库的查询入口或事务.
 * @param row 要插入的行.
 */
export function insertAttachmentRow(orm: VaultOrm, row: AttachmentRow): void {
  orm.insert(entryAttachments).values(row).run();
}

/**
 * 删除一个附件的元数据行, 内容行随外键级联删除.
 * @param orm 已解锁数据库的查询入口或事务.
 * @param attachmentId 附件编号.
 * @returns 附件存在并已删除时为 true, 没有这个编号时为 false.
 */
export function deleteAttachmentRow(
  orm: VaultOrm,
  attachmentId: string,
): boolean {
  const deleted = orm
    .delete(entryAttachments)
    .where(eq(entryAttachments.id, attachmentId))
    .returning({ id: entryAttachments.id })
    .all();
  return deleted.length > 0;
}
