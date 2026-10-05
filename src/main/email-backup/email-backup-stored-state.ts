import {
  emailBackupSucceeded,
  type EmailBackupFailureReason,
  type EmailBackupResult,
} from "@shared/email-backup/email-backup-result";
import {
  DEFAULT_EMAIL_BACKUP_SETTINGS,
  type EmailBackupSettings,
  type EmailBackupSettingsView,
} from "@shared/email-backup/email-backup-settings";

import {
  runWithDatabase,
  type DatabaseAccess,
} from "../vault/database/database-access";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import {
  readCredentials,
  writeCredentials,
  type EmailBackupCredentials,
} from "./email-backup-credentials-repository";
import {
  readSettings,
  writeSettings,
} from "./email-backup-settings-repository";

/**
 * 加密库里保存的邮箱备份状态: 设置加两项机密. 只在主进程里存在.
 */
export interface EmailBackupStoredState {
  /**
   * 是否保存过设置, 没保存过时 `settings` 是默认值.
   */
  readonly isSaved: boolean;
  /**
   * 邮箱备份设置.
   */
  readonly settings: EmailBackupSettings;
  /**
   * 两项机密.
   */
  readonly credentials: EmailBackupCredentials;
}

/**
 * 从加密库读出邮箱备份状态.
 * @param orm 已解锁数据库的查询入口.
 * @returns 邮箱备份状态.
 */
export function loadStoredState(orm: VaultOrm): EmailBackupStoredState {
  const settings = readSettings(orm);
  return {
    isSaved: settings !== undefined,
    settings: settings ?? DEFAULT_EMAIL_BACKUP_SETTINGS,
    credentials: readCredentials(orm),
  };
}

/**
 * 在已解锁的数据库上读出邮箱备份状态, 未解锁时返回 `vault-locked`, 读取意外失败时通知回调.
 * @param access 取数据库与报告失败的依赖.
 * @returns 邮箱备份状态, 未解锁或出错时为失败结果.
 */
export function readStoredState(
  access: DatabaseAccess,
): EmailBackupResult<EmailBackupStoredState> {
  return runWithDatabase<EmailBackupStoredState, EmailBackupFailureReason>(
    access,
    (orm) => emailBackupSucceeded(loadStoredState(orm)),
  );
}

/**
 * 把邮箱备份状态写进加密库, 设置与机密在同一个事务里.
 * @param orm 已解锁数据库的查询入口.
 * @param settings 要保存的设置.
 * @param credentials 要保存的机密.
 */
export function saveStoredState(
  orm: VaultOrm,
  settings: EmailBackupSettings,
  credentials: EmailBackupCredentials,
): void {
  orm.transaction((transaction) => {
    writeSettings(transaction, settings);
    writeCredentials(transaction, credentials);
  });
}

/**
 * 由保存的状态得出交给渲染端的设置视图, 只带 "已设置" 一类标志, 不带授权码与口令.
 * @param state 邮箱备份状态.
 * @param requiresMasterPassword 保存设置与立即备份是否要重新输入主密码.
 * @returns 设置视图.
 */
export function toSettingsView(
  state: EmailBackupStoredState,
  requiresMasterPassword: boolean,
): EmailBackupSettingsView {
  return {
    ...state.settings,
    isSaved: state.isSaved,
    hasAuthorizationCode: state.credentials.authorizationCode !== undefined,
    hasPassphrase: state.credentials.passphrase !== undefined,
    requiresMasterPassword,
  };
}
