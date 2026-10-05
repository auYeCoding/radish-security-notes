import { findEmailBackupSettingsProblems } from "@shared/email-backup/email-backup-settings-rules";
import type { EmailBackupSettingsView } from "@shared/email-backup/email-backup-settings";
import { EMAIL_PROVIDER_PRESETS } from "@shared/email-backup/email-provider-presets";
import { hasConnectionTargetChanged } from "@shared/email-backup/smtp-connection";
import {
  findPassphrasePairProblem,
  type PassphrasePairProblem,
} from "@shared/export/export-limits";

import { settingsOfDraft, type EmailBackupDraft } from "./email-backup-draft";

/**
 * 判断填写内容里设置字段是否与已保存的设置不同, 或填了新的授权码与口令.
 * @param draft 填写内容.
 * @param view 已保存的设置视图.
 * @returns 有未保存的修改时为 true.
 */
export function isDraftDirty(
  draft: EmailBackupDraft,
  view: EmailBackupSettingsView,
): boolean {
  const next = settingsOfDraft(draft);
  const changedField = (Object.keys(next) as (keyof typeof next)[]).some(
    (key) => next[key] !== view[key],
  );
  return (
    changedField ||
    draft.authorizationCode !== "" ||
    draft.passphrase !== "" ||
    draft.passphraseConfirmation !== ""
  );
}

/**
 * 判断是否必须重新填写授权码: 没保存过授权码, 或连接目标 (邮箱类型, 服务器, 发件地址) 变了.
 * @param draft 填写内容.
 * @param view 已保存的设置视图.
 * @returns 必须重新填写时为 true.
 */
export function isAuthorizationCodeRequired(
  draft: EmailBackupDraft,
  view: EmailBackupSettingsView,
): boolean {
  return (
    !view.hasAuthorizationCode ||
    (view.isSaved && hasConnectionTargetChanged(settingsOfDraft(draft), view))
  );
}

/**
 * 找出加密口令现在的问题: 没勾选加密, 或口令框都没填且已保存过口令 (保持不变) 时没有问题.
 * @param draft 填写内容.
 * @param view 已保存的设置视图.
 * @returns 口令太短或两次不一致时为对应的问题, 没有问题时为 undefined.
 */
export function findDraftPassphraseProblem(
  draft: EmailBackupDraft,
  view: EmailBackupSettingsView,
): PassphrasePairProblem | undefined {
  if (!draft.isEncrypted) {
    return undefined;
  }
  const isBlank =
    draft.passphrase === "" && draft.passphraseConfirmation === "";
  if (isBlank && view.hasPassphrase && view.isEncrypted) {
    return undefined;
  }
  return findPassphrasePairProblem(
    draft.passphrase,
    draft.passphraseConfirmation,
  );
}

/**
 * 判断必须填写的密码类字段都填了: 加密时口令合规, 明文时已确认风险, 必须重填的授权码与设了主密码时的
 * 主密码.
 * @param draft 填写内容.
 * @param view 已保存的设置视图.
 * @returns 都填了时为 true.
 */
function hasRequiredSecrets(
  draft: EmailBackupDraft,
  view: EmailBackupSettingsView,
): boolean {
  return (
    findDraftPassphraseProblem(draft, view) === undefined &&
    (draft.isEncrypted || draft.hasAcknowledgedPlaintextRisk) &&
    (!isAuthorizationCodeRequired(draft, view) ||
      draft.authorizationCode !== "") &&
    (!view.requiresMasterPassword || draft.masterPassword !== "")
  );
}

/**
 * 判断设置能不能保存: 邮箱类型被支持, 各字段合规, 必须填的字段都填了, 并且有未保存的修改.
 * @param draft 填写内容.
 * @param view 已保存的设置视图.
 * @returns 能保存时为 true.
 */
export function canSaveDraft(
  draft: EmailBackupDraft,
  view: EmailBackupSettingsView,
): boolean {
  return (
    EMAIL_PROVIDER_PRESETS[draft.provider].isSupported &&
    findEmailBackupSettingsProblems(settingsOfDraft(draft)).length === 0 &&
    hasRequiredSecrets(draft, view) &&
    (isDraftDirty(draft, view) || !view.isSaved)
  );
}

/**
 * 判断能不能发送测试邮件: 已保存过设置, 没有未保存的修改, 邮箱类型被支持.
 * @param draft 填写内容.
 * @param view 已保存的设置视图.
 * @returns 能发送时为 true.
 */
export function canSendTest(
  draft: EmailBackupDraft,
  view: EmailBackupSettingsView,
): boolean {
  return (
    view.isSaved &&
    view.hasAuthorizationCode &&
    EMAIL_PROVIDER_PRESETS[view.provider].isSupported &&
    !isDraftDirty(draft, view)
  );
}

/**
 * 判断能不能立即备份: 能发测试邮件, 设了主密码时已填主密码.
 * @param draft 填写内容.
 * @param view 已保存的设置视图.
 * @returns 能立即备份时为 true.
 */
export function canRunBackup(
  draft: EmailBackupDraft,
  view: EmailBackupSettingsView,
): boolean {
  return (
    canSendTest(draft, view) &&
    (!view.requiresMasterPassword || draft.masterPassword !== "")
  );
}
