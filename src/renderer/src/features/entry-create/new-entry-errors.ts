import { CUSTOM_FIELD_ERROR_CODES } from "@shared/entries/custom-field-schema";
import type { EntryFieldDefinition } from "@shared/entries/entry-field-types";
import type { EntryFailureReason } from "@shared/entries/entry-result";
import {
  ENTRY_NAME_MAX_LENGTH,
  NEW_ENTRY_ERROR_CODES,
} from "@shared/entries/new-entry-schema";
import type { EntryFieldKey } from "@shared/entries/preset-entry-types";
import type { TFunction } from "i18next";

/**
 * 把新建表单里名称与自定义字段的校验错误代码换成当前语言的文案.
 * @param code 校验消息, 由新建校验方案与自定义字段的校验方案产生.
 * @param translate 翻译函数.
 * @returns 文案, 不认识的代码返回 undefined.
 */
export function describeNewEntryError(
  code: string | undefined,
  translate: TFunction,
): string | undefined {
  switch (code) {
    case NEW_ENTRY_ERROR_CODES.nameRequired:
      return translate("entryCreate.error.nameRequired");
    case NEW_ENTRY_ERROR_CODES.nameTooLong:
      return translate("entryCreate.error.nameTooLong", {
        maxLength: ENTRY_NAME_MAX_LENGTH,
      });
    case CUSTOM_FIELD_ERROR_CODES.labelRequired:
      return translate("entryCreate.error.customFieldLabelRequired");
    default:
      return undefined;
  }
}

/**
 * 把类型字段的校验错误代码换成当前语言的文案.
 * @param code 校验消息, 由新建校验方案产生.
 * @param field 出错的字段定义.
 * @param translate 翻译函数.
 * @returns 文案, 不认识的代码返回 undefined.
 */
export function describeFieldError(
  code: string | undefined,
  field: EntryFieldDefinition<EntryFieldKey>,
  translate: TFunction,
): string | undefined {
  if (code !== NEW_ENTRY_ERROR_CODES.fieldTooLong) {
    return undefined;
  }
  return translate("entryCreate.error.fieldTooLong", {
    label: translate(`entryFields.${field.key}`),
    maxLength: field.maxLength,
  });
}

/**
 * 把保存失败的原因换成当前语言的文案.
 * @param reason 主进程报告的失败原因.
 * @param translate 翻译函数.
 * @returns 文案.
 */
export function describeCreateFailure(
  reason: EntryFailureReason,
  translate: TFunction,
): string {
  return reason === "invalid-input"
    ? translate("entryCreate.error.invalid")
    : translate("entryCreate.error.unexpected");
}
