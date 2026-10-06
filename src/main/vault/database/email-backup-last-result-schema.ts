import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { EmailBackupTriggerKind } from "@shared/email-backup/email-backup-trigger-kind";

/**
 * 上次邮箱备份结果表, 在迁移 0011 加入, 迁移 0012 加了触发方式与上次成功时间: 只有一行, `id` 恒为
 * 1. 记备份尝试结束的时刻, 成功或失败, 失败的原因代码, 触发方式, 不记邮箱地址, 文件名与任何条目
 * 内容. `last_success_at` 是最近一次成功备份的时刻, 失败时保留原值, 自动备份据它判断是否满一个间隔.
 */
export const emailBackupLastResults = sqliteTable("email_backup_last_results", {
  id: integer("id").primaryKey(),
  completedAt: integer("completed_at").notNull(),
  outcome: text("outcome").$type<"success" | "failure">().notNull(),
  reason: text("reason"),
  triggerKind: text("trigger_kind")
    .$type<EmailBackupTriggerKind>()
    .notNull()
    .default("manual"),
  lastSuccessAt: integer("last_success_at"),
});
