import { asc, eq, sql } from "drizzle-orm";

import type { TagColorKey } from "@shared/tags/tag-colors";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { tags } from "../vault/database/tag-schema";

/**
 * 标签表里的一行.
 */
export type TagRecord = typeof tags.$inferSelect;

/**
 * 插入一个标签.
 * @param orm 已解锁数据库的查询入口.
 * @param record 要插入的行.
 */
export function insertTag(orm: VaultOrm, record: TagRecord): void {
  orm.insert(tags).values(record).run();
}

/**
 * 读取全部标签, 先创建的在前, 创建时间相同时先插入的在前.
 * @param orm 已解锁数据库的查询入口.
 * @returns 标签行列表.
 */
export function listTags(orm: VaultOrm): TagRecord[] {
  return orm
    .select()
    .from(tags)
    .orderBy(asc(tags.createdAt), sql`rowid asc`)
    .all();
}

/**
 * 按编号读取一个标签.
 * @param orm 已解锁数据库的查询入口.
 * @param id 标签编号.
 * @returns 标签所在的行, 没有这个编号时为 undefined.
 */
export function findTag(orm: VaultOrm, id: string): TagRecord | undefined {
  return orm.select().from(tags).where(eq(tags.id, id)).get();
}

/**
 * 修改一个标签的名称与颜色.
 * @param orm 已解锁数据库的查询入口.
 * @param id 标签编号.
 * @param name 新名称.
 * @param color 新颜色键.
 * @returns 标签存在并已修改时为 true, 没有这个编号时为 false.
 */
export function updateTag(
  orm: VaultOrm,
  id: string,
  name: string,
  color: TagColorKey,
): boolean {
  const updated = orm
    .update(tags)
    .set({ name, color })
    .where(eq(tags.id, id))
    .returning({ id: tags.id })
    .all();
  return updated.length > 0;
}

/**
 * 删除一个标签. 条目上的这个标签由关联表的级联外键一并摘掉, 条目本身不动.
 * @param orm 已解锁数据库的查询入口.
 * @param id 标签编号.
 * @returns 标签存在并已删除时为 true, 没有这个编号时为 false.
 */
export function deleteTag(orm: VaultOrm, id: string): boolean {
  const deleted = orm
    .delete(tags)
    .where(eq(tags.id, id))
    .returning({ id: tags.id })
    .all();
  return deleted.length > 0;
}
