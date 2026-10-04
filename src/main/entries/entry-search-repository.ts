import { sql, type SQL } from "drizzle-orm";

import { SEARCHABLE_FIELD_KEYS } from "@shared/search/search-fields";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { entries } from "../vault/database/entry-schema";

/**
 * 搜索从条目表读出的一行. 只含参与搜索的列与键: 类型字段是只含键白名单里键的 JSON 对象文本,
 * 自定义字段只有字段名的 JSON 数组文本; TOTP, 保密类型字段与自定义字段的值不在其中.
 */
export interface EntrySearchRow {
  /**
   * 条目的唯一编号.
   */
  readonly id: string;
  /**
   * 条目名称.
   */
  readonly name: string;
  /**
   * 条目的类型键.
   */
  readonly type: string;
  /**
   * 类型字段里键在白名单里的键值对, JSON 对象文本.
   */
  readonly searchableFields: string;
  /**
   * 条目的备注.
   */
  readonly notes: string;
  /**
   * 自定义字段的字段名, JSON 数组文本.
   */
  readonly customFieldLabels: string;
}

/**
 * 类型字段键白名单在 SQL 里的写法: 每个键作为绑定参数, 用逗号隔开.
 */
const SEARCHABLE_KEY_LIST: SQL = sql.join(
  SEARCHABLE_FIELD_KEYS.map((key) => sql`${key}`),
  sql`, `,
);

/**
 * 搜索读取条目的查询. 类型字段在 SQLite 里用 `json_each` 加键白名单筛出, 自定义字段只取字段名,
 * 不查 `totp` 列, 所以未选定参与搜索的值不会离开 SQLite.
 */
export const ENTRY_SEARCH_QUERY: SQL = sql`
  select
    ${entries.id} as id,
    ${entries.name} as name,
    ${entries.type} as type,
    (
      select json_group_object(key, value)
      from json_each(${entries.fields})
      where key in (${SEARCHABLE_KEY_LIST})
    ) as searchableFields,
    ${entries.notes} as notes,
    (
      select json_group_array(json_extract(value, '$.label'))
      from json_each(${entries.customFields})
    ) as customFieldLabels
  from ${entries}
`;

/**
 * 读取全部条目参与搜索的列.
 * @param orm 已解锁数据库的查询入口.
 * @returns 条目行列表.
 */
export function listEntrySearchRows(orm: VaultOrm): EntrySearchRow[] {
  return orm.all<EntrySearchRow>(ENTRY_SEARCH_QUERY);
}
