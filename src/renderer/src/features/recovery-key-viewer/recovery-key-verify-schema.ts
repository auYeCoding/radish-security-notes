import type { TFunction } from "i18next";
import { z } from "zod";

/**
 * 验证身份的方式: 设了主密码时输入当前主密码, 由系统保护数据密钥时勾选确认周围没有他人查看.
 */
export type RecoveryKeyVerifyMode = "master-password" | "system";

/**
 * 验证表单校验产生的错误代码, 显示时再换成当前语言的文案.
 */
export const VERIFY_ERROR_CODES = {
  passwordRequired: "passwordRequired",
  notAcknowledged: "notAcknowledged",
} as const;

/**
 * 两种验证方式共用的表单取值: 当前主密码与确认勾选, 各方式只校验自己用到的那一项.
 */
const verifyShape = {
  currentPassword: z.string(),
  acknowledged: z.boolean(),
};

/**
 * 设了主密码时的校验方案: 填了当前主密码.
 */
const masterPasswordVerifySchema = z.object({
  ...verifyShape,
  currentPassword: z.string().min(1, VERIFY_ERROR_CODES.passwordRequired),
});

/**
 * 由系统保护时的校验方案: 勾选了确认周围没有他人查看.
 */
const systemVerifySchema = z.object({
  ...verifyShape,
  acknowledged: z.boolean().refine((isAcknowledged) => isAcknowledged, {
    message: VERIFY_ERROR_CODES.notAcknowledged,
  }),
});

/**
 * 各验证方式对应的校验方案.
 */
export const VERIFY_SCHEMAS = {
  "master-password": masterPasswordVerifySchema,
  system: systemVerifySchema,
} as const satisfies Record<RecoveryKeyVerifyMode, z.ZodType>;

/**
 * 验证表单的取值.
 */
export type RecoveryKeyVerifyValues = z.infer<
  typeof masterPasswordVerifySchema
>;

/**
 * 验证表单的初始取值.
 */
export const VERIFY_DEFAULT_VALUES: RecoveryKeyVerifyValues = {
  currentPassword: "",
  acknowledged: false,
};

/**
 * 把验证表单的错误代码换成当前语言的文案.
 * @param code 校验消息, 由 `VERIFY_SCHEMAS` 产生.
 * @param translate 翻译函数.
 * @returns 文案, 不认识的代码返回 undefined.
 */
export function describeVerifyFieldError(
  code: string | undefined,
  translate: TFunction,
): string | undefined {
  switch (code) {
    case VERIFY_ERROR_CODES.passwordRequired:
      return translate(
        "settings.security.recoveryKey.verify.error.passwordRequired",
      );
    case VERIFY_ERROR_CODES.notAcknowledged:
      return translate(
        "settings.security.recoveryKey.verify.error.notAcknowledged",
      );
    default:
      return undefined;
  }
}
