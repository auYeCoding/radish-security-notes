import { MASTER_PASSWORD_MIN_LENGTH } from "@shared/vault/master-password-policy";
import { NEW_PASSWORD_ERROR_CODES } from "@shared/vault/new-password-rules";
import type { TFunction } from "i18next";

/**
 * 把新主密码校验的错误代码换成当前语言的文案.
 * @param code 校验消息, 由 `newPasswordShape` 与 `PASSWORD_MISMATCH_ISSUE` 产生.
 * @param translate 翻译函数.
 * @returns 文案, 不认识的代码返回 undefined.
 */
export function describeNewPasswordError(
  code: string | undefined,
  translate: TFunction,
): string | undefined {
  switch (code) {
    case NEW_PASSWORD_ERROR_CODES.tooShort:
      return translate("vault.newPassword.error.tooShort", {
        minLength: MASTER_PASSWORD_MIN_LENGTH,
      });
    case NEW_PASSWORD_ERROR_CODES.mismatch:
      return translate("vault.newPassword.error.mismatch");
    default:
      return undefined;
  }
}
