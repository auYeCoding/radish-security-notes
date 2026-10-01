import { z } from "zod";

/**
 * 条目名称允许的最多字符数.
 */
export const ENTRY_NAME_MAX_LENGTH = 100;

/**
 * 条目账号允许的最多字符数.
 */
export const ENTRY_ACCOUNT_MAX_LENGTH = 200;

/**
 * 条目密码允许的最多字符数.
 */
export const ENTRY_PASSWORD_MAX_LENGTH = 1000;

/**
 * 新建条目校验失败的错误代码, 显示时再换成当前语言的文案.
 */
export const NEW_ENTRY_ERROR_CODES = {
  nameRequired: "nameRequired",
  nameTooLong: "nameTooLong",
  accountTooLong: "accountTooLong",
  passwordTooLong: "passwordTooLong",
} as const;

/**
 * 判断文本是否没有超过最多字符数. 按 Unicode 码点计数, 一个汉字或表情只算一个字符.
 * @param value 待判断的文本.
 * @param maxLength 允许的最多字符数.
 * @returns 没有超过时返回 true.
 */
function isWithinLength(value: string, maxLength: number): boolean {
  return Array.from(value).length <= maxLength;
}

/**
 * 新建条目的校验方案, 渲染端表单与主进程共用: 名称去首尾空格后不能为空, 三项都不能超过
 * 各自的最多字符数, 账号与密码可以为空. 校验消息是 `NEW_ENTRY_ERROR_CODES` 里的错误代码.
 */
export const newEntrySchema = z.object({
  name: z
    .string()
    .trim()
    .refine((name) => name.length > 0, {
      message: NEW_ENTRY_ERROR_CODES.nameRequired,
    })
    .refine((name) => isWithinLength(name, ENTRY_NAME_MAX_LENGTH), {
      message: NEW_ENTRY_ERROR_CODES.nameTooLong,
    }),
  account: z
    .string()
    .refine((account) => isWithinLength(account, ENTRY_ACCOUNT_MAX_LENGTH), {
      message: NEW_ENTRY_ERROR_CODES.accountTooLong,
    }),
  password: z
    .string()
    .refine((password) => isWithinLength(password, ENTRY_PASSWORD_MAX_LENGTH), {
      message: NEW_ENTRY_ERROR_CODES.passwordTooLong,
    }),
});

/**
 * 新建条目表单的取值.
 */
export type NewEntryFormValues = z.infer<typeof newEntrySchema>;
