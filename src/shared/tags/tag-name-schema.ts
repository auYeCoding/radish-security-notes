import { z } from "zod";

import { isWithinLength } from "../text/is-within-length";
import { TAG_COLOR_KEYS, type TagColorKey } from "./tag-colors";

/**
 * 标签名称允许的最多字符数.
 */
export const TAG_NAME_MAX_LENGTH = 50;

/**
 * 标签名称校验失败的错误代码, 显示时再换成当前语言的文案.
 */
export const TAG_NAME_ERROR_CODES = {
  nameRequired: "nameRequired",
  nameTooLong: "nameTooLong",
} as const;

/**
 * 新建与编辑标签表单的取值.
 */
export interface TagFormValues {
  /**
   * 标签名称.
   */
  name: string;
  /**
   * 标签在调色板里的颜色键.
   */
  color: TagColorKey;
}

/**
 * 标签名称与颜色的校验方案, 渲染端表单与主进程共用: 名称去首尾空格后不能为空且不超过最多
 * 字符数, 校验消息是 `TAG_NAME_ERROR_CODES` 里的错误代码; 颜色必须是调色板里的键. 重名由主进程
 * 的标签服务判定.
 * @returns 标签表单的校验方案.
 */
export function createTagFormSchema(): z.ZodType<TagFormValues, TagFormValues> {
  return z.object({
    name: z
      .string()
      .trim()
      .refine((name) => name.length > 0, {
        message: TAG_NAME_ERROR_CODES.nameRequired,
      })
      .refine((name) => isWithinLength(name, TAG_NAME_MAX_LENGTH), {
        message: TAG_NAME_ERROR_CODES.nameTooLong,
      }),
    color: z.enum(TAG_COLOR_KEYS),
  });
}
