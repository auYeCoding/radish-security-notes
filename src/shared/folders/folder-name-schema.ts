import { z } from "zod";

import { isWithinLength } from "../text/is-within-length";

/**
 * 文件夹名称允许的最多字符数.
 */
export const FOLDER_NAME_MAX_LENGTH = 50;

/**
 * 文件夹名称校验失败的错误代码, 显示时再换成当前语言的文案.
 */
export const FOLDER_NAME_ERROR_CODES = {
  nameRequired: "nameRequired",
  nameTooLong: "nameTooLong",
} as const;

/**
 * 新建与重命名文件夹表单的取值.
 */
export interface FolderNameFormValues {
  /**
   * 文件夹名称.
   */
  name: string;
}

/**
 * 文件夹名称的校验方案, 渲染端表单与主进程共用: 去首尾空格后不能为空且不超过最多字符数,
 * 校验消息是 `FOLDER_NAME_ERROR_CODES` 里的错误代码. 重名由主进程的文件夹服务判定.
 * @returns 文件夹名称表单的校验方案.
 */
export function createFolderNameSchema(): z.ZodType<
  FolderNameFormValues,
  FolderNameFormValues
> {
  return z.object({
    name: z
      .string()
      .trim()
      .refine((name) => name.length > 0, {
        message: FOLDER_NAME_ERROR_CODES.nameRequired,
      })
      .refine((name) => isWithinLength(name, FOLDER_NAME_MAX_LENGTH), {
        message: FOLDER_NAME_ERROR_CODES.nameTooLong,
      }),
  });
}
