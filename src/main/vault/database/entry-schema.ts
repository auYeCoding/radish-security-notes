import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { EntryCustomField } from "@shared/entries/custom-field-types";

/**
 * 条目表: 每行是一个条目. 创建时间只用来排序, 不展示给用户. 网址, 备注与自定义字段在
 * 迁移 0002 加入, 旧条目升级后网址与备注为空串, 自定义字段为空数组. 自定义字段按填写顺序
 * 存成 JSON 数组.
 */
export const entries = sqliteTable("entries", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  account: text("account").notNull(),
  password: text("password").notNull(),
  url: text("url").notNull().default(""),
  notes: text("notes").notNull().default(""),
  customFields: text("custom_fields", { mode: "json" })
    .$type<readonly EntryCustomField[]>()
    .notNull()
    .default([]),
  createdAt: integer("created_at").notNull(),
});
