import type { EmailBackupFailureReason } from "@shared/email-backup/email-backup-result";

import { findMailSessionRejection } from "./email-backup-mail-session";
import type { EmailBackupStoredState } from "./email-backup-stored-state";

/**
 * 判断已保存的状态能不能备份: 能发邮件, 加密时有口令, 明文时已确认风险. 立即备份, 自动备份与
 * 开启自动备份的前置条件都用它.
 * @param state 邮箱备份状态.
 * @returns 不能备份时的失败原因, 能备份时为 undefined.
 */
export function findBackupReadinessProblem(
  state: EmailBackupStoredState,
): EmailBackupFailureReason | undefined {
  const rejection = findMailSessionRejection(state);
  if (rejection !== undefined) {
    return rejection;
  }
  if (state.settings.isEncrypted) {
    return state.credentials.passphrase === undefined
      ? "passphrase-missing"
      : undefined;
  }
  return state.settings.hasAcknowledgedPlaintextRisk
    ? undefined
    : "plaintext-not-acknowledged";
}
