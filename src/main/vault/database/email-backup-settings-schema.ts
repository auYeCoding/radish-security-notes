import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type {
  EmailConnectionSecurity,
  EmailProviderKey,
} from "@shared/email-backup/email-provider-presets";

/**
 * 邮箱备份设置表, 在迁移 0011 加入: 只有一行, `id` 恒为 1, 存用户填写的非保密设置. 授权码与备份
 * 口令不在这张表, 在 `email_backup_credentials` 表, 这样读设置的查询永远读不到机密. 服务器地址,
 * 端口与连接方式只对自定义类型有意义, 预置类型取预置表.
 */
export const emailBackupSettings = sqliteTable("email_backup_settings", {
  id: integer("id").primaryKey(),
  provider: text("provider").$type<EmailProviderKey>().notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  security: text("security").$type<EmailConnectionSecurity>().notNull(),
  senderAddress: text("sender_address").notNull(),
  recipientAddress: text("recipient_address").notNull(),
  sizeLimitMebibytes: integer("size_limit_mebibytes").notNull(),
  isEncrypted: integer("is_encrypted", { mode: "boolean" }).notNull(),
  hasAcknowledgedPlaintextRisk: integer("has_acknowledged_plaintext_risk", {
    mode: "boolean",
  }).notNull(),
});
