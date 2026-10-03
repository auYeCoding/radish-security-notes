import { CUSTOM_FIELD_ERROR_CODES } from "@shared/entries/custom-field-schema";
import type { EntryFieldDefinition } from "@shared/entries/entry-field-types";
import {
  ENTRY_NAME_MAX_LENGTH,
  NEW_ENTRY_ERROR_CODES,
} from "@shared/entries/new-entry-schema";
import type { EntryFieldKey } from "@shared/entries/preset-entry-types";
import { MAX_TOTP_PERIOD_SECONDS } from "@shared/entries/totp-config";
import { TOTP_INPUT_ERROR_CODES } from "@shared/entries/totp-input-parser";
import type { TFunction } from "i18next";

/**
 * 把条目表单里名称, 自定义字段与 TOTP 的校验错误代码换成当前语言的文案.
 * @param code 校验消息, 由条目内容的校验方案, 自定义字段的校验方案与 TOTP 解析产生.
 * @param translate 翻译函数.
 * @returns 文案, 不认识的代码返回 undefined.
 */
export function describeEntryFormError(
  code: string | undefined,
  translate: TFunction,
): string | undefined {
  switch (code) {
    case NEW_ENTRY_ERROR_CODES.nameRequired:
      return translate("entryForm.error.nameRequired");
    case NEW_ENTRY_ERROR_CODES.nameTooLong:
      return translate("entryForm.error.nameTooLong", {
        maxLength: ENTRY_NAME_MAX_LENGTH,
      });
    case CUSTOM_FIELD_ERROR_CODES.labelRequired:
      return translate("entryForm.error.customFieldLabelRequired");
    case TOTP_INPUT_ERROR_CODES.invalid:
      return translate("entryForm.error.totpInvalid");
    case TOTP_INPUT_ERROR_CODES.unsupported:
      return translate("entryForm.error.totpUnsupported", {
        maxPeriod: MAX_TOTP_PERIOD_SECONDS,
      });
    default:
      return undefined;
  }
}

/**
 * 把类型字段的校验错误代码换成当前语言的文案.
 * @param code 校验消息, 由条目内容的校验方案产生.
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
  return translate("entryForm.error.fieldTooLong", {
    label: translate(`entryFields.${field.key}`),
    maxLength: field.maxLength,
  });
}
