import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * 上次邮箱备份结果表, 在迁移 0011 加入: 只有一行, `id` 恒为 1. 记备份尝试结束的时刻, 成功或失败,
 * 失败的原因代码, 不记邮箱地址, 文件名与任何条目内容.
 */
export const emailBackupLastResults = sqliteTable("email_backup_last_results", {
  id: integer("id").primaryKey(),
  completedAt: integer("completed_at").notNull(),
  outcome: text("outcome").$type<"success" | "failure">().notNull(),
  reason: text("reason"),
});
