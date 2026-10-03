import { asc, eq, sql } from "drizzle-orm";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { entries } from "../vault/database/entry-schema";
import { folders } from "../vault/database/folder-schema";

/**
 * 文件夹表里的一行.
 */
export type FolderRecord = typeof folders.$inferSelect;

/**
 * 插入一个文件夹.
 * @param orm 已解锁数据库的查询入口.
 * @param record 要插入的行.
 */
export function insertFolder(orm: VaultOrm, record: FolderRecord): void {
  orm.insert(folders).values(record).run();
}

/**
 * 读取全部文件夹, 先创建的在前, 创建时间相同时先插入的在前.
 * @param orm 已解锁数据库的查询入口.
 * @returns 文件夹行列表.
 */
export function listFolders(orm: VaultOrm): FolderRecord[] {
  return orm
    .select()
    .from(folders)
    .orderBy(asc(folders.createdAt), sql`rowid asc`)
    .all();
}

/**
 * 按编号读取一个文件夹.
 * @param orm 已解锁数据库的查询入口.
 * @param id 文件夹编号.
 * @returns 文件夹所在的行, 没有这个编号时为 undefined.
 */
export function findFolder(
  orm: VaultOrm,
  id: string,
): FolderRecord | undefined {
  return orm.select().from(folders).where(eq(folders.id, id)).get();
}

/**
 * 判断条目选的文件夹是否有效: 没有选文件夹 (未分类) 总是有效, 选了就必须是存在的文件夹.
 * @param orm 已解锁数据库的查询入口.
 * @param folderId 条目选的文件夹编号, 未分类时为 undefined.
 * @returns 有效时返回 true.
 */
export function isFolderChoiceValid(
  orm: VaultOrm,
  folderId: string | undefined,
): boolean {
  return folderId === undefined || findFolder(orm, folderId) !== undefined;
}

/**
 * 修改一个文件夹的名称.
 * @param orm 已解锁数据库的查询入口.
 * @param id 文件夹编号.
 * @param name 新名称.
 * @returns 文件夹存在并已改名时为 true, 没有这个编号时为 false.
 */
export function renameFolder(orm: VaultOrm, id: string, name: string): boolean {
  const updated = orm
    .update(folders)
    .set({ name })
    .where(eq(folders.id, id))
    .returning({ id: folders.id })
    .all();
  return updated.length > 0;
}

/**
 * 删除一个文件夹: 在同一个事务里先把其中条目的所属清空, 再删除文件夹本身, 条目不删除.
 * @param orm 已解锁数据库的查询入口.
 * @param id 文件夹编号.
 * @returns 文件夹存在并已删除时为 true, 没有这个编号时为 false.
 */
export function deleteFolderKeepingEntries(orm: VaultOrm, id: string): boolean {
  return orm.transaction((transaction) => {
    transaction
      .update(entries)
      .set({ folderId: null })
      .where(eq(entries.folderId, id))
      .run();
    const deleted = transaction
      .delete(folders)
      .where(eq(folders.id, id))
      .returning({ id: folders.id })
      .all();
    return deleted.length > 0;
  });
}

/**
 * 设置一个条目所属的文件夹.
 * @param orm 已解锁数据库的查询入口.
 * @param entryId 条目编号.
 * @param folderId 目标文件夹编号, 条目未分类时为 null.
 * @returns 条目存在并已更新时为 true, 没有这个条目编号时为 false.
 */
export function setEntryFolder(
  orm: VaultOrm,
  entryId: string,
  folderId: string | null,
): boolean {
  const updated = orm
    .update(entries)
    .set({ folderId })
    .where(eq(entries.id, entryId))
    .returning({ id: entries.id })
    .all();
  return updated.length > 0;
}
