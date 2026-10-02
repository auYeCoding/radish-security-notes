import { z } from "zod";

import { isMasterPasswordLongEnough } from "./master-password-policy";

/**
 * 新主密码校验产生的错误代码, 显示时再换成当前语言的文案.
 */
export const NEW_PASSWORD_ERROR_CODES = {
  tooShort: "tooShort",
  mismatch: "mismatch",
} as const;

/**
 * 新主密码与确认输入两个字段的校验形状, 引导页与恢复页共用.
 */
export const newPasswordShape = {
  password: z.string().refine(isMasterPasswordLongEnough, {
    message: NEW_PASSWORD_ERROR_CODES.tooShort,
  }),
  confirmation: z.string(),
};

/**
 * 两次输入一致的校验不通过时, 错误挂在确认输入框上的问题描述.
 */
export const PASSWORD_MISMATCH_ISSUE = {
  path: ["confirmation"],
  message: NEW_PASSWORD_ERROR_CODES.mismatch,
};

/**
 * 新主密码与确认输入的取值.
 */
export interface NewPasswordValues {
  /**
   * 用户设置的主密码.
   */
  readonly password: string;
  /**
   * 再次输入的主密码.
   */
  readonly confirmation: string;
}

/**
 * 判断两次输入的主密码是否一致.
 * @param values 主密码与确认输入.
 * @returns 一致返回 true.
 */
export function isPasswordConfirmed(values: NewPasswordValues): boolean {
  return values.password === values.confirmation;
}
