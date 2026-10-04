import { z } from "zod";

import { isSameName } from "../../text/is-same-name";
import { isWithinLength } from "../../text/is-within-length";
import { CUSTOM_FIELD_KINDS, type CustomFieldKind } from "./custom-field-kinds";
import { canBeSummary } from "./custom-field-summary";
import {
  CUSTOM_ENTRY_TYPE_FIELD_NAME_MAX_LENGTH,
  CUSTOM_ENTRY_TYPE_MAX_FIELDS,
  CUSTOM_ENTRY_TYPE_NAME_MAX_LENGTH,
} from "./custom-entry-type-limits";

/**
 * 新建自定义类型校验失败的错误代码, 显示时再换成当前语言的文案. 类型名称与已有类型重名, 自定义
 * 类型个数超过上限需要读库, 由主进程的类型服务判定, 不在这里.
 */
export const CUSTOM_ENTRY_TYPE_ERROR_CODES = {
  nameRequired: "customTypeNameRequired",
  nameTooLong: "customTypeNameTooLong",
  fieldsRequired: "customTypeFieldsRequired",
  tooManyFields: "customTypeTooManyFields",
  fieldNameRequired: "customTypeFieldNameRequired",
  fieldNameTooLong: "customTypeFieldNameTooLong",
  fieldNameDuplicate: "customTypeFieldNameDuplicate",
  unknownKind: "customTypeUnknownKind",
  summaryInvalid: "customTypeSummaryInvalid",
} as const;

/**
 * 新建类型表单里一个字段的取值. 数组与记录不加只读修饰, 以便表单库的字段数组使用.
 */
export interface CustomEntryTypeFieldFormValues {
  /**
   * 字段名.
   */
  name: string;
  /**
   * 取值形态.
   */
  kind: CustomFieldKind;
  /**
   * 是否保密.
   */
  isSensitive: boolean;
  /**
   * 是否是列表摘要字段.
   */
  isSummary: boolean;
}

/**
 * 新建类型表单的取值.
 */
export interface CustomEntryTypeFormValues {
  /**
   * 类型名称.
   */
  name: string;
  /**
   * 类型的字段, 顺序就是表单与详情里的顺序.
   */
  fields: CustomEntryTypeFieldFormValues[];
}

/**
 * 名称校验失败时的错误代码.
 */
interface NameErrorCodes {
  /**
   * 名称去空格后为空时的错误代码.
   */
  readonly required: string;
  /**
   * 名称超过最多字符数时的错误代码.
   */
  readonly tooLong: string;
}

/**
 * 一个名称的校验方案: 去首尾空格后不能为空且不超过最多字符数.
 * @param maxLength 允许的最多字符数.
 * @param codes 为空与过长时的错误代码.
 * @returns 名称的校验方案.
 */
function createNameSchema(
  maxLength: number,
  codes: NameErrorCodes,
): z.ZodType<string, string> {
  return z
    .string()
    .trim()
    .refine((name) => name.length > 0, { message: codes.required })
    .refine((name) => isWithinLength(name, maxLength), {
      message: codes.tooLong,
    });
}

/**
 * 一个字段的校验方案: 字段名去首尾空格后不能为空且不超过最多字符数, 取值形态必须在形态清单里.
 * @returns 字段的校验方案.
 */
function createFieldSchema(): z.ZodType<
  CustomEntryTypeFieldFormValues,
  CustomEntryTypeFieldFormValues
> {
  return z.object({
    name: createNameSchema(CUSTOM_ENTRY_TYPE_FIELD_NAME_MAX_LENGTH, {
      required: CUSTOM_ENTRY_TYPE_ERROR_CODES.fieldNameRequired,
      tooLong: CUSTOM_ENTRY_TYPE_ERROR_CODES.fieldNameTooLong,
    }),
    kind: z.enum(CUSTOM_FIELD_KINDS, {
      message: CUSTOM_ENTRY_TYPE_ERROR_CODES.unknownKind,
    }),
    isSensitive: z.boolean(),
    isSummary: z.boolean(),
  });
}

/**
 * 给字段名与前面某个字段重名的字段报错, 重名按文件夹名称同样的规则判定.
 * @param fields 全部字段.
 * @param context 校验上下文.
 */
function reportDuplicateFieldNames(
  fields: readonly CustomEntryTypeFieldFormValues[],
  context: z.RefinementCtx,
): void {
  fields.forEach((field, index) => {
    const isDuplicate = fields
      .slice(0, index)
      .some((earlier) => isSameName(earlier.name, field.name));
    if (isDuplicate) {
      context.addIssue({
        code: "custom",
        message: CUSTOM_ENTRY_TYPE_ERROR_CODES.fieldNameDuplicate,
        path: [index, "name"],
      });
    }
  });
}

/**
 * 给不能作摘要的摘要字段与第二个及之后的摘要字段报错.
 * @param fields 全部字段.
 * @param context 校验上下文.
 */
function reportInvalidSummaries(
  fields: readonly CustomEntryTypeFieldFormValues[],
  context: z.RefinementCtx,
): void {
  let summaryCount = 0;
  fields.forEach((field, index) => {
    if (!field.isSummary) {
      return;
    }
    summaryCount += 1;
    if (summaryCount > 1 || !canBeSummary(field)) {
      context.addIssue({
        code: "custom",
        message: CUSTOM_ENTRY_TYPE_ERROR_CODES.summaryInvalid,
        path: [index, "isSummary"],
      });
    }
  });
}

/**
 * 字段列表的校验方案: 至少一个字段, 不超过最多个数, 字段名不重复, 摘要字段至多一个且是非保密
 * 的单行字段.
 * @returns 字段列表的校验方案.
 */
function createFieldsSchema(): z.ZodType<
  CustomEntryTypeFieldFormValues[],
  CustomEntryTypeFieldFormValues[]
> {
  return z
    .array(createFieldSchema())
    .min(1, { message: CUSTOM_ENTRY_TYPE_ERROR_CODES.fieldsRequired })
    .max(CUSTOM_ENTRY_TYPE_MAX_FIELDS, {
      message: CUSTOM_ENTRY_TYPE_ERROR_CODES.tooManyFields,
    })
    .superRefine((fields, context) => {
      reportDuplicateFieldNames(fields, context);
      reportInvalidSummaries(fields, context);
    });
}

/**
 * 新建自定义类型的校验方案, 渲染端表单与主进程共用: 类型名称去首尾空格后不能为空且不超过最多
 * 字符数, 字段规则见 `createFieldsSchema`, 校验消息是 `CUSTOM_ENTRY_TYPE_ERROR_CODES` 里的错误
 * 代码. 与已有类型重名与类型个数上限由主进程的类型服务判定.
 * @returns 新建类型的校验方案.
 */
export function createCustomEntryTypeSchema(): z.ZodType<
  CustomEntryTypeFormValues,
  CustomEntryTypeFormValues
> {
  return z.object({
    name: createNameSchema(CUSTOM_ENTRY_TYPE_NAME_MAX_LENGTH, {
      required: CUSTOM_ENTRY_TYPE_ERROR_CODES.nameRequired,
      tooLong: CUSTOM_ENTRY_TYPE_ERROR_CODES.nameTooLong,
    }),
    fields: createFieldsSchema(),
  });
}
