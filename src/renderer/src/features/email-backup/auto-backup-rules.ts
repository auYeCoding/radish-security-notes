import type { AutoBackupStatus } from "@shared/email-backup/auto-backup-status";
import type { EmailBackupSettingsView } from "@shared/email-backup/email-backup-settings";

import type { EmailBackupDraft } from "./email-backup-draft";
import { isDraftDirty } from "./email-backup-draft-rules";

/**
 * 判断是不是还缺主密码: 保险库设了主密码, 开启自动备份与开着改间隔时要重新输入, 而填写内容里还没有.
 * @param draft 填写内容.
 * @param view 已保存的设置视图.
 * @returns 还缺主密码时为 true.
 */
export function isMasterPasswordMissing(
  draft: EmailBackupDraft,
  view: EmailBackupSettingsView,
): boolean {
  return view.requiresMasterPassword && draft.masterPassword === "";
}

/**
 * 判断能不能把自动备份打开: 邮箱设置已能备份, 没有未保存的修改 (打开后用的是已保存的设置), 设了
 * 主密码时已填主密码.
 * @param status 自动备份的状态.
 * @param draft 填写内容.
 * @param view 已保存的设置视图.
 * @returns 能打开时为 true.
 */
export function canTurnOnAutoBackup(
  status: AutoBackupStatus,
  draft: EmailBackupDraft,
  view: EmailBackupSettingsView,
): boolean {
  return (
    status.blocker === undefined &&
    !isDraftDirty(draft, view) &&
    !isMasterPasswordMissing(draft, view)
  );
}

/**
 * 判断能不能改间隔: 关着时改间隔不需要主密码, 开着时要.
 * @param status 自动备份的状态.
 * @param draft 填写内容.
 * @param view 已保存的设置视图.
 * @returns 能改间隔时为 true.
 */
export function canChangeAutoBackupInterval(
  status: AutoBackupStatus,
  draft: EmailBackupDraft,
  view: EmailBackupSettingsView,
): boolean {
  return !status.isEnabled || !isMasterPasswordMissing(draft, view);
}
