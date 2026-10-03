import { asc, eq, inArray } from "drizzle-orm";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { entryTags, tags } from "../vault/database/tag-schema";

/**
 * 读取全部条目带的标签编号, 每个条目的标签按选择顺序排列, 没有标签的条目不在结果里.
 * @param orm 已解锁数据库的查询入口.
 * @returns 条目编号到标签编号列表的映射.
 */
export function listTagIdsByEntry(orm: VaultOrm): Map<string, string[]> {
  const rows = orm
    .select({ entryId: entryTags.entryId, tagId: entryTags.tagId })
    .from(entryTags)
    .orderBy(asc(entryTags.entryId), asc(entryTags.position))
    .all();
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    const own = grouped.get(row.entryId);
    if (own === undefined) {
      grouped.set(row.entryId, [row.tagId]);
    } else {
      own.push(row.tagId);
    }
  }
  return grouped;
}

/**
 * 读取一个条目带的标签编号, 按选择顺序排列.
 * @param orm 已解锁数据库的查询入口.
 * @param entryId 条目编号.
 * @returns 标签编号列表, 条目没有标签时为空.
 */
export function listTagIdsOfEntry(orm: VaultOrm, entryId: string): string[] {
  return orm
    .select({ tagId: entryTags.tagId })
    .from(entryTags)
    .where(eq(entryTags.entryId, entryId))
    .orderBy(asc(entryTags.position))
    .all()
    .map((row) => row.tagId);
}

/**
 * 整组替换一个条目带的标签: 先清掉原有的关联, 再按给定顺序写入新的. 调用方要把它与写条目放在
 * 同一个事务里.
 * @param orm 已解锁数据库的查询入口或事务.
 * @param entryId 条目编号.
 * @param tagIds 条目带的标签编号, 按选择顺序排列, 必须互不重复且都存在.
 */
export function replaceEntryTags(
  orm: VaultOrm,
  entryId: string,
  tagIds: readonly string[],
): void {
  orm.delete(entryTags).where(eq(entryTags.entryId, entryId)).run();
  if (tagIds.length === 0) {
    return;
  }
  orm
    .insert(entryTags)
    .values(tagIds.map((tagId, position) => ({ entryId, tagId, position })))
    .run();
}

/**
 * 判断给定的标签编号是否都对应存在的标签, 不带标签 (空列表) 总是有效.
 * @param orm 已解锁数据库的查询入口.
 * @param tagIds 标签编号, 必须互不重复.
 * @returns 全部存在时返回 true.
 */
export function areAllTagsExisting(
  orm: VaultOrm,
  tagIds: readonly string[],
): boolean {
  if (tagIds.length === 0) {
    return true;
  }
  const found = orm
    .select({ id: tags.id })
    .from(tags)
    .where(inArray(tags.id, [...tagIds]))
    .all();
  return found.length === tagIds.length;
}
