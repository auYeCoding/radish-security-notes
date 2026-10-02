import type { VaultFailureReason } from "@shared/vault/vault-operation-result";
import { MASTER_PASSWORD_MIN_LENGTH } from "@shared/vault/master-password-policy";
import type { TFunction } from "i18next";

/**
 * 把恢复流程的失败原因换成提示条里的文案.
 * @param reason 失败原因, 没有失败时为 undefined.
 * @param wordPosition 不在词表的词的序号 (从 1 起), 其它失败为 undefined.
 * @param translate 翻译函数.
 * @returns 提示文案, 没有失败时为 undefined.
 */
export function describeRestoreFailure(
  reason: VaultFailureReason | undefined,
  wordPosition: number | undefined,
  translate: TFunction,
): string | undefined {
  switch (reason) {
    case undefined:
      return undefined;
    case "recovery-unknown-word":
      return translate("vault.restore.error.unknownWord", {
        position: wordPosition ?? 0,
      });
    case "recovery-word-count":
      return translate("vault.restore.error.wordCount");
    case "recovery-checksum":
      return translate("vault.restore.error.checksum");
    case "recovery-key-rejected":
      return translate("vault.restore.error.keyRejected");
    case "system-protection-unavailable":
      return translate("vault.restore.error.systemUnavailable");
    case "password-too-short":
      return translate("vault.newPassword.error.tooShort", {
        minLength: MASTER_PASSWORD_MIN_LENGTH,
      });
    default:
      return translate("vault.restore.error.unexpected");
  }
}
