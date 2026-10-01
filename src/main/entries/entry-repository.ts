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
 * 按编号读取一个条目.
 * @param orm 已解锁数据库的查询入口.
 * @param id 条目编号.
 * @returns 条目所在的行, 没有这个编号时为 undefined.
 */
export function findEntry(orm: VaultOrm, id: string): EntryRecord | undefined {
  return orm.select().from(entries).where(eq(entries.id, id)).get();
}
