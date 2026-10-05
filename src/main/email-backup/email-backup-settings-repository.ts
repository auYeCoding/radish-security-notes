import { eq } from "drizzle-orm";

import type { EmailBackupSettings } from "@shared/email-backup/email-backup-settings";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { emailBackupSettings } from "../vault/database/email-backup-settings-schema";
import { EMAIL_BACKUP_ROW_ID } from "./email-backup-row-id";

/**
 * 读取已保存的邮箱备份设置.
 * @param orm 已解锁数据库的查询入口.
 * @returns 设置, 从没保存过时为 undefined.
 */
export function readSettings(orm: VaultOrm): EmailBackupSettings | undefined {
  const row = orm
    .select()
    .from(emailBackupSettings)
    .where(eq(emailBackupSettings.id, EMAIL_BACKUP_ROW_ID))
    .get();
  if (row === undefined) {
    return undefined;
  }
  return {
    provider: row.provider,
    host: row.host,
    port: row.port,
    security: row.security,
    senderAddress: row.senderAddress,
    recipientAddress: row.recipientAddress,
    sizeLimitMebibytes: row.sizeLimitMebibytes,
    isEncrypted: row.isEncrypted,
    hasAcknowledgedPlaintextRisk: row.hasAcknowledgedPlaintextRisk,
  };
}

/**
 * 保存邮箱备份设置, 已有就覆盖.
 * @param orm 已解锁数据库的查询入口.
 * @param settings 要保存的设置.
 */
export function writeSettings(
  orm: VaultOrm,
  settings: EmailBackupSettings,
): void {
  orm
    .insert(emailBackupSettings)
    .values({ id: EMAIL_BACKUP_ROW_ID, ...settings })
    .onConflictDoUpdate({ target: emailBackupSettings.id, set: settings })
    .run();
}
