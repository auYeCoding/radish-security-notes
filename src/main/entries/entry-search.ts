import type { EntrySearchHit } from "@shared/search/entry-search-types";
import { matchEntryDocument } from "@shared/search/match-entry-document";
import { parseSearchQuery } from "@shared/search/parse-search-query";

import { listTagNamesByEntry } from "../tags/entry-tag-name-repository";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { toSearchDocument } from "./entry-search-documents";
import { listEntrySearchRows } from "./entry-search-repository";

/**
 * 在已解锁数据库的全部条目里搜索: 读出参与搜索的名称, 类型字段, 备注, 自定义字段名与标签名, 逐条
 * 判断是否命中全部关键字词. 读出的文本只在这次调用的局部变量里, 调用返回后不再被引用, 不建索引,
 * 不缓存, 不写日志; 返回的只有命中的条目编号与命中的字段名.
 * @param orm 已解锁数据库的查询入口.
 * @param query 搜索栏里的关键字.
 * @returns 命中的条目与命中字段, 顺序与读出条目的顺序一致; 关键字里没有有效的词时为空数组.
 */
export function searchEntries(
  orm: VaultOrm,
  query: string,
): readonly EntrySearchHit[] {
  const terms = parseSearchQuery(query);
  if (terms.length === 0) {
    return [];
  }
  const tagNames = listTagNamesByEntry(orm);
  return listEntrySearchRows(orm).flatMap((row) => {
    const document = toSearchDocument(row, tagNames.get(row.id) ?? []);
    const fields = matchEntryDocument(document, terms);
    return fields === undefined ? [] : [{ id: row.id, fields }];
  });
}
