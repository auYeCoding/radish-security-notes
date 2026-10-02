import { z } from "zod";

import { customFieldInputSchema } from "./custom-field-schema";
import type { NewCustomFieldInput } from "./custom-field-types";
import type { EntryFieldDefinition } from "./entry-field-types";
import type { PresetEntryTypeDefinition } from "./preset-entry-types";
import { isTotpInputBlank, parseTotpInput } from "./totp-input-parser";

/**
 * 条目名称允许的最多字符数.
 */
export const ENTRY_NAME_MAX_LENGTH = 100;

/**
 * 新建条目表单的取值, 不含类型, 类型由选择界面给出. 数组与记录不加只读修饰, 以便表单库
 * 的字段数组与字段路径使用.
 */
export interface NewEntryFormValues {
  /**
   * 条目名称.
   */
  name: string;
  /**
   * 类型字段取值, 类型的每个字段都有一项.
   */
  fields: Record<string, string>;
  /**
   * 条目的备注.
   */
  notes: string;
  /**
   * 条目的自定义字段.
   */
  customFields: NewCustomFieldInput[];
  /**
   * TOTP 输入: Base32 密钥或 otpauth 链接, 空串表示不带 TOTP.
   */
  totp: string;
}

/**
 * 新建条目校验失败的错误代码, 显示时再换成当前语言的文案. TOTP 输入不合法时的错误代码是
 * `TOTP_INPUT_ERROR_CODES` 里的值.
 */
export const NEW_ENTRY_ERROR_CODES = {
  nameRequired: "nameRequired",
  nameTooLong: "nameTooLong",
  fieldTooLong: "fieldTooLong",
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
 * TOTP 输入的校验方案: 是字符串, 空串表示不带 TOTP, 非空时必须能解析成受支持的 TOTP 配置,
 * 否则校验消息是解析失败的错误代码.
 * @returns TOTP 输入的校验方案.
 */
function createTotpSchema(): z.ZodString {
  return z.string().superRefine((value, context) => {
    if (isTotpInputBlank(value)) {
      return;
    }
    const result = parseTotpInput(value);
    if (!result.ok) {
      context.addIssue({ code: "custom", message: result.code });
    }
  });
}

/**
 * 一个类型字段的校验方案: 是字符串, 定义里给了长度上限时不能超过它, 原样保存.
 * @param field 字段定义.
 * @returns 字段的校验方案.
 */
function createFieldSchema(field: EntryFieldDefinition): z.ZodString {
  const { maxLength } = field;
  const text = z.string();
  if (maxLength === undefined) {
    return text;
  }
  return text.refine((value) => isWithinLength(value, maxLength), {
    message: NEW_ENTRY_ERROR_CODES.fieldTooLong,
  });
}

/**
 * 按类型生成新建条目的校验方案, 渲染端表单与主进程共用: 名称去首尾空格后不能为空且不超过
 * 最多字符数, 类型的每个字段都必须是字符串并满足字段定义里的长度上限, 类型之外的字段被丢弃,
 * 备注与自定义字段不设长度与数量上限, TOTP 输入为空或能解析成受支持的配置. 校验消息是
 * `NEW_ENTRY_ERROR_CODES`, `CUSTOM_FIELD_ERROR_CODES` 或 `TOTP_INPUT_ERROR_CODES` 里的错误
 * 代码.
 * @param type 条目类型定义.
 * @returns 该类型的新建条目校验方案.
 */
export function createNewEntrySchema(
  type: PresetEntryTypeDefinition,
): z.ZodType<NewEntryFormValues, NewEntryFormValues> {
  return z.object({
    name: z
      .string()
      .trim()
      .refine((name) => name.length > 0, {
        message: NEW_ENTRY_ERROR_CODES.nameRequired,
      })
      .refine((name) => isWithinLength(name, ENTRY_NAME_MAX_LENGTH), {
        message: NEW_ENTRY_ERROR_CODES.nameTooLong,
      }),
    fields: z.object(
      Object.fromEntries(
        type.fields.map((field) => [field.key, createFieldSchema(field)]),
      ),
    ),
    notes: z.string(),
    customFields: z.array(customFieldInputSchema),
    totp: createTotpSchema(),
  });
}
