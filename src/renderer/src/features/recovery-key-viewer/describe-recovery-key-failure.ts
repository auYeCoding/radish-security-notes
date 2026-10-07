import type { TFunction } from "i18next";

import type { VaultFailureReason } from "@shared/vault/vault-operation-result";

/**
 * 把查看恢复密钥失败的原因换成当前语言的文案. 提示里不带主密码, 密钥与恢复词.
 * @param reason 失败原因, 没有失败时为 undefined.
 * @param translate 翻译函数.
 * @returns 文案, 没有失败时为 undefined.
 */
export function describeRecoveryKeyFailure(
  reason: VaultFailureReason | undefined,
  translate: TFunction,
): string | undefined {
  switch (reason) {
    case undefined:
      return undefined;
    case "wrong-password":
      return translate(
        "settings.security.recoveryKey.verify.error.wrongPassword",
      );
    case "unexpected-state":
      return translate(
        "settings.security.recoveryKey.verify.error.unexpectedState",
      );
    default:
      return translate("settings.security.recoveryKey.verify.error.unexpected");
  }
}
