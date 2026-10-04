import { asc, eq } from "drizzle-orm";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { entryTags, tags } from "../vault/database/tag-schema";

/**
 * 读取全部条目带的标签名, 每个条目的标签名按选择顺序排列, 没有标签的条目不在结果里. 只读标签名,
 * 不读标签颜色与创建时间.
 * @param orm 已解锁数据库的查询入口.
 * @returns 条目编号到标签名列表的映射.
 */
export function listTagNamesByEntry(orm: VaultOrm): Map<string, string[]> {
  const rows = orm
    .select({ entryId: entryTags.entryId, name: tags.name })
    .from(entryTags)
    .innerJoin(tags, eq(entryTags.tagId, tags.id))
    .orderBy(asc(entryTags.entryId), asc(entryTags.position))
    .all();
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    const own = grouped.get(row.entryId);
    if (own === undefined) {
      grouped.set(row.entryId, [row.name]);
    } else {
      own.push(row.name);
    }
  }
  return grouped;
}
