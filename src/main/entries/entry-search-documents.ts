import { z } from "zod";

import type { EntryTypeCatalog } from "@shared/entries/custom-types/entry-type-catalog";
import type { EntrySearchDocument } from "@shared/search/entry-search-types";
import { searchableFieldKeysOf } from "@shared/search/search-fields";

import type { EntrySearchRow } from "./entry-search-repository";

/**
 * 类型字段 JSON 的结构: 键与值都是字符串.
 */
const searchableFieldsSchema = z.record(z.string(), z.string());

/**
 * 自定义字段名 JSON 的结构: 字符串数组.
 */
const customFieldLabelsSchema = z.array(z.string());

/**
 * 从读出的类型字段里只留下条目类型里参与搜索的键. 类型不在目录里时一个键都不留.
 * @param row 搜索读出的条目行.
 * @param catalog 条目类型目录.
 * @returns 参与搜索的类型字段取值.
 */
function readSearchableFields(
  row: EntrySearchRow,
  catalog: EntryTypeCatalog,
): Readonly<Record<string, string>> {
  const type = catalog.find(row.type);
  if (type === undefined) {
    return {};
  }
  const stored = searchableFieldsSchema.parse(JSON.parse(row.searchableFields));
  const keys = new Set<string>(searchableFieldKeysOf(type));
  return Object.fromEntries(
    Object.entries(stored).filter(([key]) => keys.has(key)),
  );
}

/**
 * 把搜索读出的一行和条目带的标签名转成搜索文档.
 * @param row 搜索读出的条目行.
 * @param tagNames 条目带的标签名, 没有标签时为空数组.
 * @param catalog 条目类型目录, 用来按类型取参与搜索的字段键.
 * @returns 搜索文档.
 * @throws Error 当行里的 JSON 不符合预期结构时.
 */
export function toSearchDocument(
  row: EntrySearchRow,
  tagNames: readonly string[],
  catalog: EntryTypeCatalog,
): EntrySearchDocument {
  return {
    id: row.id,
    name: row.name,
    fields: readSearchableFields(row, catalog),
    notes: row.notes,
    customFieldLabels: customFieldLabelsSchema.parse(
      JSON.parse(row.customFieldLabels),
    ),
    tagNames,
  };
}
