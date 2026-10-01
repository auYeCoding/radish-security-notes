import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { EntryCustomField } from "@shared/entries/custom-field-types";
import type { EntryFieldValues } from "@shared/entries/entry-types";
import {
  LEGACY_ENTRY_TYPE_KEY,
  type EntryTypeKey,
} from "@shared/entries/preset-entry-types";

/**
 * 条目表: 每行是一个条目. 创建时间只用来排序, 不展示给用户. 备注与自定义字段在迁移 0002
 * 加入, 对所有条目共有, 自定义字段按填写顺序存成 JSON 数组. 类型与类型字段在迁移 0003 加入:
 * `type` 是类型键, `fields` 是 JSON 对象, 键是该类型的字段键, 值是用户填写的文本; 旧的账号,
 * 密码与网址三列在同一迁移里搬进 `fields` 后删除, 旧条目归入通用登录.
 */
export const entries = sqliteTable("entries", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type")
    .$type<EntryTypeKey>()
    .notNull()
    .default(LEGACY_ENTRY_TYPE_KEY),
  fields: text("fields", { mode: "json" })
    .$type<EntryFieldValues>()
    .notNull()
    .default({}),
  notes: text("notes").notNull().default(""),
  customFields: text("custom_fields", { mode: "json" })
    .$type<readonly EntryCustomField[]>()
    .notNull()
    .default([]),
  createdAt: integer("created_at").notNull(),
});
