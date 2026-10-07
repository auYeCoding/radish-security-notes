import type { TFunction } from "i18next";
import { z } from "zod";

/**
 * 关闭主密码表单校验产生的错误代码, 显示时再换成当前语言的文案.
 */
export const DISABLE_ERROR_CODES = {
  passwordRequired: "passwordRequired",
  notAcknowledged: "notAcknowledged",
} as const;

/**
 * 关闭主密码表单的校验方案: 填了当前主密码, 并勾选了解关闭后的保护强度.
 */
export const disableMasterPasswordSchema = z.object({
  currentPassword: z.string().min(1, DISABLE_ERROR_CODES.passwordRequired),
  acknowledged: z.boolean().refine((isAcknowledged) => isAcknowledged, {
    message: DISABLE_ERROR_CODES.notAcknowledged,
  }),
});

/**
 * 关闭主密码表单的取值.
 */
export type DisableMasterPasswordValues = z.infer<
  typeof disableMasterPasswordSchema
>;

/**
 * 关闭主密码表单的初始取值.
 */
export const DISABLE_DEFAULT_VALUES: DisableMasterPasswordValues = {
  currentPassword: "",
  acknowledged: false,
};

/**
 * 把关闭主密码表单的错误代码换成当前语言的文案.
 * @param code 校验消息, 由 `disableMasterPasswordSchema` 产生.
 * @param translate 翻译函数.
 * @returns 文案, 不认识的代码返回 undefined.
 */
export function describeDisableFieldError(
  code: string | undefined,
  translate: TFunction,
): string | undefined {
  switch (code) {
    case DISABLE_ERROR_CODES.passwordRequired:
      return translate(
        "settings.security.masterPassword.disable.error.passwordRequired",
      );
    case DISABLE_ERROR_CODES.notAcknowledged:
      return translate(
        "settings.security.masterPassword.disable.error.notAcknowledged",
      );
    default:
      return undefined;
  }
}
