import { desc, eq, sql } from "drizzle-orm";

import { ACCOUNT_FIELD_KEY } from "@shared/entries/common-entry-fields";
import type { EntrySummary } from "@shared/entries/entry-types";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { entries } from "../vault/database/entry-schema";

/**
 * 条目表里的一行.
 */
export type EntryRecord = typeof entries.$inferSelect;

/**
 * 在类型字段的 JSON 里取账号的路径.
 */
const ACCOUNT_JSON_PATH = `$.${ACCOUNT_FIELD_KEY}`;

/**
 * 插入一个条目.
 * @param orm 已解锁数据库的查询入口.
 * @param record 要插入的行.
 */
export function insertEntry(orm: VaultOrm, record: EntryRecord): void {
  orm.insert(entries).values(record).run();
}

/**
 * 读取全部条目的摘要, 最新创建的在最前, 创建时间相同时后插入的在前. 账号取自类型字段里键为
 * `account` 的值, 类型没有这个字段或没有填写时为空串.
 * @param orm 已解锁数据库的查询入口.
 * @returns 摘要列表.
 */
export function listEntrySummaries(orm: VaultOrm): EntrySummary[] {
  return orm
    .select({
      id: entries.id,
      name: entries.name,
      type: entries.type,
      account: sql<string>`coalesce(json_extract(${entries.fields}, ${ACCOUNT_JSON_PATH}), '')`,
    })
    .from(entries)
    .orderBy(desc(entries.createdAt), sql`rowid desc`)
    .all();
}

/**
 * 更新一个条目的内容: 名称, 类型字段, 备注, 自定义字段与 TOTP. 编号, 类型与创建时间不变.
 * @param orm 已解锁数据库的查询入口.
 * @param record 更新后的行, 编号指明要更新的条目.
 * @returns 条目存在并已更新时为 true, 没有这个编号时为 false.
 */
export function updateEntry(orm: VaultOrm, record: EntryRecord): boolean {
  const updated = orm
    .update(entries)
    .set({
      name: record.name,
      fields: record.fields,
      notes: record.notes,
      customFields: record.customFields,
      totp: record.totp,
    })
    .where(eq(entries.id, record.id))
    .returning({ id: entries.id })
    .all();
  return updated.length > 0;
}

/**
 * 删除一个条目, 记录从表里移除.
 * @param orm 已解锁数据库的查询入口.
 * @param id 条目编号.
 * @returns 条目存在并已删除时为 true, 没有这个编号时为 false.
 */
export function deleteEntry(orm: VaultOrm, id: string): boolean {
  const deleted = orm
    .delete(entries)
    .where(eq(entries.id, id))
    .returning({ id: entries.id })
    .all();
  return deleted.length > 0;
}

/**
 * 按编号读取一个条目.
 * @param orm 已解锁数据库的查询入口.
 * @param id 条目编号.
 * @returns 条目所在的行, 没有这个编号时为 undefined.
 */
export function findEntry(orm: VaultOrm, id: string): EntryRecord | undefined {
  return orm.select().from(entries).where(eq(entries.id, id)).get();
}
