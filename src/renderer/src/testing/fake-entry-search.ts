import type { EntryDetail } from "@shared/entries/entry-types";
import { findEntryType } from "@shared/entries/preset-entry-types";
import type {
  EntrySearchDocument,
  EntrySearchHit,
} from "@shared/search/entry-search-types";
import { matchEntryDocument } from "@shared/search/match-entry-document";
import { parseSearchQuery } from "@shared/search/parse-search-query";
import { searchableFieldKeysOf } from "@shared/search/search-fields";
import type { TagSummary } from "@shared/tags/tag-types";

/**
 * 由假桥里的条目详情生成搜索文档, 与主进程一样只取参与搜索的类型字段, 自定义字段只取字段名.
 * @param detail 条目详情.
 * @param tags 假标签桥里的标签, 用来把标签编号换成标签名.
 * @returns 搜索文档.
 */
function toFakeDocument(
  detail: EntryDetail,
  tags: readonly TagSummary[],
): EntrySearchDocument {
  const type = findEntryType(detail.type);
  const keys = type === undefined ? [] : searchableFieldKeysOf(type);
  return {
    id: detail.id,
    name: detail.name,
    fields: Object.fromEntries(
      keys.map((key) => [key, detail.fields[key] ?? ""]),
    ),
    notes: detail.notes,
    customFieldLabels: detail.customFields.map((field) => field.label),
    tagNames: (detail.tagIds ?? []).flatMap((tagId) =>
      tags.filter((tag) => tag.id === tagId).map((tag) => tag.name),
    ),
  };
}

/**
 * 在假桥的条目里搜索, 匹配规则与主进程相同.
 * @param details 假桥里的条目详情.
 * @param tags 假标签桥里的标签.
 * @param query 搜索栏里的关键字.
 * @returns 命中列表, 顺序与条目顺序一致.
 */
export function searchFakeEntries(
  details: readonly EntryDetail[],
  tags: readonly TagSummary[],
  query: string,
): EntrySearchHit[] {
  const terms = parseSearchQuery(query);
  return details.flatMap((detail) => {
    const fields = matchEntryDocument(toFakeDocument(detail, tags), terms);
    return fields === undefined ? [] : [{ id: detail.id, fields }];
  });
}
