import { toEntryTypeDefinition } from "@shared/entries/custom-types/custom-entry-type-definition";
import type { CustomEntryType } from "@shared/entries/custom-types/custom-entry-type-types";
import type { EntryTypeDefinition } from "@shared/entries/entry-field-types";
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
 * 在预设类型与假桥里的自定义类型中按类型键找类型定义.
 * @param key 条目的类型键.
 * @param customTypes 假桥里的自定义类型.
 * @returns 类型定义, 找不到时为 undefined.
 */
function findFakeType(
  key: string,
  customTypes: readonly CustomEntryType[],
): EntryTypeDefinition | undefined {
  const custom = customTypes.find((type) => type.key === key);
  return custom === undefined
    ? findEntryType(key)
    : toEntryTypeDefinition(custom);
}

/**
 * 由假桥里的条目详情生成搜索文档, 与主进程一样只取参与搜索的类型字段, 自定义字段只取字段名.
 * @param detail 条目详情.
 * @param tags 假标签桥里的标签, 用来把标签编号换成标签名.
 * @param customTypes 假桥里的自定义类型.
 * @returns 搜索文档.
 */
function toFakeDocument(
  detail: EntryDetail,
  tags: readonly TagSummary[],
  customTypes: readonly CustomEntryType[],
): EntrySearchDocument {
  const type = findFakeType(detail.type, customTypes);
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
 * @param customTypes 假桥里的自定义类型, 默认没有.
 * @returns 命中列表, 顺序与条目顺序一致.
 */
export function searchFakeEntries(
  details: readonly EntryDetail[],
  tags: readonly TagSummary[],
  query: string,
  customTypes: readonly CustomEntryType[] = [],
): EntrySearchHit[] {
  const terms = parseSearchQuery(query);
  return details.flatMap((detail) => {
    const fields = matchEntryDocument(
      toFakeDocument(detail, tags, customTypes),
      terms,
    );
    return fields === undefined ? [] : [{ id: detail.id, fields }];
  });
}
