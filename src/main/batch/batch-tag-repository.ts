import { asc, inArray } from "drizzle-orm";

import type { EntryTagAssignment } from "@shared/batch/entry-tag-assignment";

import { replaceEntryTags } from "../tags/entry-tag-repository";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { entryTags } from "../vault/database/tag-schema";
import { chunkIds } from "./batch-id-chunks";

/**
 * 读取给定条目带的标签编号, 每个条目的标签按选择顺序排列, 没有标签的条目不在结果里.
 * @param orm 已解锁数据库的查询入口或事务.
 * @param entryIds 条目编号.
 * @returns 条目编号到标签编号列表的映射.
 */
export function listTagIdsOfEntries(
  orm: VaultOrm,
  entryIds: readonly string[],
): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  chunkIds(entryIds).forEach((chunk) => {
    const rows = orm
      .select({ entryId: entryTags.entryId, tagId: entryTags.tagId })
      .from(entryTags)
      .where(inArray(entryTags.entryId, [...chunk]))
      .orderBy(asc(entryTags.entryId), asc(entryTags.position))
      .all();
    rows.forEach((row) => {
      const own = grouped.get(row.entryId) ?? [];
      own.push(row.tagId);
      grouped.set(row.entryId, own);
    });
  });
  return grouped;
}

/**
 * 整组改写一批条目带的标签, 每个条目的原有关联被清掉, 再按给定顺序写入新的. 调用方要把它放在
 * 事务里, 并先确认条目与标签都存在, 标签互不重复.
 * @param orm 已解锁数据库的查询入口或事务.
 * @param assignments 每个条目改写后带的标签.
 */
export function replaceTagsOfEntries(
  orm: VaultOrm,
  assignments: readonly EntryTagAssignment[],
): void {
  assignments.forEach((assignment) => {
    replaceEntryTags(orm, assignment.entryId, assignment.tagIds);
  });
}
