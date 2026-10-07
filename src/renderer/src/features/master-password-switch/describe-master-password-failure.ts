import type { TFunction } from "i18next";

import { MASTER_PASSWORD_MIN_LENGTH } from "@shared/vault/master-password-policy";
import type { VaultFailureReason } from "@shared/vault/vault-operation-result";

/**
 * 把开启或关闭主密码失败的原因换成当前语言的文案. 提示里不带主密码与密钥.
 * @param reason 失败原因, 没有失败时为 undefined.
 * @param translate 翻译函数.
 * @returns 文案, 没有失败时为 undefined.
 */
export function describeMasterPasswordFailure(
  reason: VaultFailureReason | undefined,
  translate: TFunction,
): string | undefined {
  switch (reason) {
    case undefined:
      return undefined;
    case "wrong-password":
      return translate(
        "settings.security.masterPassword.disable.error.wrongPassword",
      );
    case "system-protection-unavailable":
      return translate(
        "settings.security.masterPassword.disable.error.systemUnavailable",
      );
    case "password-too-short":
      return translate("vault.newPassword.error.tooShort", {
        minLength: MASTER_PASSWORD_MIN_LENGTH,
      });
    case "unexpected-state":
      return translate(
        "settings.security.masterPassword.error.unexpectedState",
      );
    default:
      return translate("settings.security.masterPassword.error.unexpected");
  }
}
