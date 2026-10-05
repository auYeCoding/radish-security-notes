import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * 邮箱备份凭据表, 在迁移 0011 加入: 只有一行, `id` 恒为 1, 存授权码与备份口令这两项机密. 数据库
 * 整库加密, 机密随数据密钥保护, 不随备份导出, 也不经任何通道交给渲染端. 没保存的项为空.
 */
export const emailBackupCredentials = sqliteTable("email_backup_credentials", {
  id: integer("id").primaryKey(),
  authorizationCode: text("authorization_code"),
  passphrase: text("passphrase"),
});
