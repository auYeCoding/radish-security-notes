import { sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * 保险库的元数据表. 当前只是迁移机制的载体, 没有业务写入, 条目表在 `entry-schema.ts`.
 */
export const vaultMetadata = sqliteTable("vault_metadata", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
