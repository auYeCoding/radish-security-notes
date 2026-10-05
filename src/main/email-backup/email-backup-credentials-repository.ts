import { eq } from "drizzle-orm";

import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { emailBackupCredentials } from "../vault/database/email-backup-credentials-schema";
import { EMAIL_BACKUP_ROW_ID } from "./email-backup-row-id";

/**
 * 邮箱备份的两项机密. 只在主进程里存在, 不经任何通道交给渲染端.
 */
export interface EmailBackupCredentials {
  /**
   * 邮箱授权码或应用专用密码, 没保存时为 undefined.
   */
  readonly authorizationCode: string | undefined;
  /**
   * 备份口令, 没保存时为 undefined.
   */
  readonly passphrase: string | undefined;
}

/**
 * 读取已保存的机密.
 * @param orm 已解锁数据库的查询入口.
 * @returns 机密, 从没保存过时两项都为 undefined.
 */
export function readCredentials(orm: VaultOrm): EmailBackupCredentials {
  const row = orm
    .select()
    .from(emailBackupCredentials)
    .where(eq(emailBackupCredentials.id, EMAIL_BACKUP_ROW_ID))
    .get();
  return {
    authorizationCode: row?.authorizationCode ?? undefined,
    passphrase: row?.passphrase ?? undefined,
  };
}

/**
 * 保存机密, 已有就覆盖.
 * @param orm 已解锁数据库的查询入口.
 * @param credentials 要保存的机密, undefined 的项存成空.
 */
export function writeCredentials(
  orm: VaultOrm,
  credentials: EmailBackupCredentials,
): void {
  const values = {
    authorizationCode: credentials.authorizationCode ?? null,
    passphrase: credentials.passphrase ?? null,
  };
  orm
    .insert(emailBackupCredentials)
    .values({ id: EMAIL_BACKUP_ROW_ID, ...values })
    .onConflictDoUpdate({ target: emailBackupCredentials.id, set: values })
    .run();
}
