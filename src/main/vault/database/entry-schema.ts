import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * 条目表: 每行是一个条目. 创建时间只用来排序, 不展示给用户.
 */
export const entries = sqliteTable("entries", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  account: text("account").notNull(),
  password: text("password").notNull(),
  createdAt: integer("created_at").notNull(),
});
