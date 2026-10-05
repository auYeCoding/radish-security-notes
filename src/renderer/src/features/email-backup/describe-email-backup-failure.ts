import type { TFunction } from "i18next";

import { MAX_TRANSFER_ENTRIES } from "@shared/data-transfer/transfer-limits";
import type { EmailBackupFailureReason } from "@shared/email-backup/email-backup-result";

/**
 * 每种失败原因对应的文案键.
 */
const FAILURE_MESSAGE_KEYS = {
  "vault-locked": "emailBackup.failure.vault-locked",
  "unexpected-error": "emailBackup.failure.unexpected-error",
  "invalid-input": "emailBackup.failure.invalid-input",
  "invalid-settings": "emailBackup.failure.invalid-settings",
  busy: "emailBackup.failure.busy",
  "not-configured": "emailBackup.failure.not-configured",
  "unsupported-provider": "emailBackup.failure.unsupported-provider",
  "wrong-master-password": "emailBackup.failure.wrong-master-password",
  "authorization-code-required":
    "emailBackup.failure.authorization-code-required",
  "invalid-passphrase": "emailBackup.failure.invalid-passphrase",
  "passphrase-missing": "emailBackup.failure.passphrase-missing",
  "plaintext-not-acknowledged":
    "emailBackup.failure.plaintext-not-acknowledged",
  "no-entries": "emailBackup.failure.no-entries",
  "too-many-entries": "emailBackup.failure.too-many-entries",
  "attachment-missing": "emailBackup.failure.attachment-missing",
  "write-failed": "emailBackup.failure.write-failed",
  "too-large": "emailBackup.failure.too-large",
  "authentication-failed": "emailBackup.failure.authentication-failed",
  "connection-failed": "emailBackup.failure.connection-failed",
  "server-rejected-size": "emailBackup.failure.server-rejected-size",
  "send-failed": "emailBackup.failure.send-failed",
} as const satisfies Record<EmailBackupFailureReason, string>;

/**
 * 把邮箱备份失败的原因翻译成给用户看的文案, 条目过多的失败写出上限.
 * @param reason 失败原因.
 * @param translate 翻译函数.
 * @returns 失败文案.
 */
export function describeEmailBackupFailure(
  reason: EmailBackupFailureReason,
  translate: TFunction,
): string {
  return translate(FAILURE_MESSAGE_KEYS[reason], {
    limit: MAX_TRANSFER_ENTRIES,
  });
}
