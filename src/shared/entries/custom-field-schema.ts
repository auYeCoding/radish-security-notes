import { z } from "zod";

/**
 * 自定义字段校验失败的错误代码, 显示时再换成当前语言的文案.
 */
export const CUSTOM_FIELD_ERROR_CODES = {
  labelRequired: "customFieldLabelRequired",
} as const;

/**
 * 一个自定义字段的校验方案: 字段名去首尾空格后不能为空, 字段值原样保存且可以为空,
 * 字段名与字段值都不设长度上限. 校验消息是 `CUSTOM_FIELD_ERROR_CODES` 里的错误代码.
 */
export const customFieldInputSchema = z.object({
  label: z
    .string()
    .trim()
    .refine((label) => label.length > 0, {
      message: CUSTOM_FIELD_ERROR_CODES.labelRequired,
    }),
  value: z.string(),
  isHidden: z.boolean(),
});
