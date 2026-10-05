import { asc, sql } from "drizzle-orm";

import type { AttachmentRow } from "../../attachments/attachment-repository";
import type { EntryRecord } from "../../entries/entry-repository";
import { entryAttachments } from "../../vault/database/attachment-schema";
import type { VaultOrm } from "../../vault/database/drizzle-adapter";
import { entries } from "../../vault/database/entry-schema";

/**
 * 只带编号的条目行.
 */
export interface EntryIdRow {
  /**
   * 条目编号.
   */
  readonly id: string;
}

/**
 * 只带所属条目与字节数的附件行.
 */
export interface AttachmentSizeRow {
  /**
   * 附件所属的条目编号.
   */
  readonly entryId: string;
  /**
   * 附件的字节数.
   */
  readonly size: number;
}

/**
 * 读取全部条目所在的行, 按创建先后升序, 创建时间相同时先插入的在前. 只读.
 * @param orm 已解锁数据库的查询入口或事务.
 * @returns 条目行列表.
 */
export function selectAllEntryRows(orm: VaultOrm): EntryRecord[] {
  return orm
    .select()
    .from(entries)
    .orderBy(asc(entries.createdAt), sql`rowid asc`)
    .all();
}

/**
 * 读取全部条目的编号, 只读, 不读条目内容.
 * @param orm 已解锁数据库的查询入口或事务.
 * @returns 条目编号列表.
 */
export function selectAllEntryIds(orm: VaultOrm): EntryIdRow[] {
  return orm.select({ id: entries.id }).from(entries).all();
}

/**
 * 读取全部附件的元数据行, 按添加顺序升序. 只读, 不碰内容表.
 * @param orm 已解锁数据库的查询入口或事务.
 * @returns 附件元数据行列表.
 */
export function selectAllAttachmentRows(orm: VaultOrm): AttachmentRow[] {
  return orm
    .select()
    .from(entryAttachments)
    .orderBy(asc(entryAttachments.position))
    .all();
}

/**
 * 读取全部附件所属的条目编号与字节数, 只读, 不读附件名称与内容.
 * @param orm 已解锁数据库的查询入口或事务.
 * @returns 每个附件的所属条目编号与字节数.
 */
export function selectAttachmentSizes(orm: VaultOrm): AttachmentSizeRow[] {
  return orm
    .select({
      entryId: entryAttachments.entryId,
      size: entryAttachments.size,
    })
    .from(entryAttachments)
    .all();
}
