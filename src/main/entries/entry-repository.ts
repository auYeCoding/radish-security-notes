import { desc, eq, sql } from "drizzle-orm";

import type { EntrySummary } from "@shared/entries/entry-types";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { entries } from "../vault/database/entry-schema";

/**
 * 条目表里的一行.
 */
export type EntryRecord = typeof entries.$inferSelect;

/**
 * 插入一个条目.
 * @param orm 已解锁数据库的查询入口.
 * @param record 要插入的行.
 */
export function insertEntry(orm: VaultOrm, record: EntryRecord): void {
  orm.insert(entries).values(record).run();
}

/**
 * 读取全部条目的摘要, 最新创建的在最前, 创建时间相同时后插入的在前.
 * @param orm 已解锁数据库的查询入口.
 * @returns 摘要列表.
 */
export function listEntrySummaries(orm: VaultOrm): EntrySummary[] {
  return orm
    .select({ id: entries.id, name: entries.name, account: entries.account })
    .from(entries)
    .orderBy(desc(entries.createdAt), sql`rowid desc`)
    .all();
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
