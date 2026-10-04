import { inArray, sql } from "drizzle-orm";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { entries } from "../vault/database/entry-schema";
import { chunkIds } from "./batch-id-chunks";

/**
 * 数一数给定的编号里有多少个对应存在的条目.
 * @param orm 已解锁数据库的查询入口或事务.
 * @param ids 条目编号, 必须互不重复.
 * @returns 存在的条目个数.
 */
export function countExistingEntries(
  orm: VaultOrm,
  ids: readonly string[],
): number {
  return chunkIds(ids).reduce((total, chunk) => {
    const row = orm
      .select({ count: sql<number>`count(*)` })
      .from(entries)
      .where(inArray(entries.id, [...chunk]))
      .get();
    return total + (row?.count ?? 0);
  }, 0);
}

/**
 * 删除给定编号的条目, 记录从表里移除. 调用方要把它放在事务里, 并先确认条目都存在.
 * @param orm 已解锁数据库的查询入口或事务.
 * @param ids 条目编号.
 */
export function deleteEntriesByIds(
  orm: VaultOrm,
  ids: readonly string[],
): void {
  chunkIds(ids).forEach((chunk) => {
    orm
      .delete(entries)
      .where(inArray(entries.id, [...chunk]))
      .run();
  });
}

/**
 * 设置给定编号的条目所属的文件夹. 调用方要把它放在事务里, 并先确认条目与文件夹都存在.
 * @param orm 已解锁数据库的查询入口或事务.
 * @param ids 条目编号.
 * @param folderId 目标文件夹编号, 条目未分类时为 null.
 */
export function setFolderOfEntries(
  orm: VaultOrm,
  ids: readonly string[],
  folderId: string | null,
): void {
  chunkIds(ids).forEach((chunk) => {
    orm
      .update(entries)
      .set({ folderId })
      .where(inArray(entries.id, [...chunk]))
      .run();
  });
}
