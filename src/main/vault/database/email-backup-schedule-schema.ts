import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { AutoBackupInterval } from "@shared/email-backup/auto-backup-interval";

/**
 * 自动备份计划表, 在迁移 0012 加入: 只有一行, `id` 恒为 1. 存开关, 间隔与失败退避状态, 退避状态
 * 存库而不放内存, 应用反复重启也不会反复发送. 不记邮箱地址, 文件名与任何条目内容.
 */
export const emailBackupSchedule = sqliteTable("email_backup_schedule", {
  id: integer("id").primaryKey(),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
  intervalKey: text("interval_key").$type<AutoBackupInterval>().notNull(),
  lastAttemptAt: integer("last_attempt_at"),
  failureCount: integer("failure_count").notNull(),
  firstFailureAt: integer("first_failure_at"),
  isPaused: integer("is_paused", { mode: "boolean" }).notNull(),
  lastFailureReason: text("last_failure_reason"),
  lastFailureAt: integer("last_failure_at"),
});
