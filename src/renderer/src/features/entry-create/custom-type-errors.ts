import type { TFunction } from "i18next";

import {
  CUSTOM_ENTRY_TYPE_FIELD_NAME_MAX_LENGTH,
  CUSTOM_ENTRY_TYPE_MAX_COUNT,
  CUSTOM_ENTRY_TYPE_MAX_FIELDS,
  CUSTOM_ENTRY_TYPE_NAME_MAX_LENGTH,
} from "@shared/entries/custom-types/custom-entry-type-limits";
import { CUSTOM_ENTRY_TYPE_ERROR_CODES } from "@shared/entries/custom-types/custom-entry-type-schema";

/**
 * 校验错误代码对应的文案键, 显示时再换成当前语言的文案.
 */
const ERROR_MESSAGE_KEYS = {
  [CUSTOM_ENTRY_TYPE_ERROR_CODES.nameRequired]:
    "entryCreate.customType.error.nameRequired",
  [CUSTOM_ENTRY_TYPE_ERROR_CODES.nameTooLong]:
    "entryCreate.customType.error.nameTooLong",
  [CUSTOM_ENTRY_TYPE_ERROR_CODES.fieldsRequired]:
    "entryCreate.customType.error.fieldsRequired",
  [CUSTOM_ENTRY_TYPE_ERROR_CODES.tooManyFields]:
    "entryCreate.customType.error.tooManyFields",
  [CUSTOM_ENTRY_TYPE_ERROR_CODES.fieldNameRequired]:
    "entryCreate.customType.error.fieldNameRequired",
  [CUSTOM_ENTRY_TYPE_ERROR_CODES.fieldNameTooLong]:
    "entryCreate.customType.error.fieldNameTooLong",
  [CUSTOM_ENTRY_TYPE_ERROR_CODES.fieldNameDuplicate]:
    "entryCreate.customType.error.fieldNameDuplicate",
  [CUSTOM_ENTRY_TYPE_ERROR_CODES.unknownKind]:
    "entryCreate.customType.error.unknownKind",
  [CUSTOM_ENTRY_TYPE_ERROR_CODES.summaryInvalid]:
    "entryCreate.customType.error.summaryInvalid",
} as const;

/**
 * 判断一个校验消息是否是认得的错误代码.
 * @param code 校验消息.
 * @returns 是认得的错误代码时返回 true.
 */
function isKnownErrorCode(
  code: string | undefined,
): code is keyof typeof ERROR_MESSAGE_KEYS {
  return code !== undefined && code in ERROR_MESSAGE_KEYS;
}

/**
 * 把新建类型表单里的校验错误代码换成当前语言的文案.
 * @param code 校验消息, 由新建类型的校验方案产生.
 * @param translate 翻译函数.
 * @returns 文案, 不认识的代码返回 undefined.
 */
export function describeCustomTypeError(
  code: string | undefined,
  translate: TFunction,
): string | undefined {
  if (!isKnownErrorCode(code)) {
    return undefined;
  }
  return translate(ERROR_MESSAGE_KEYS[code], {
    maxLength:
      code === CUSTOM_ENTRY_TYPE_ERROR_CODES.nameTooLong
        ? CUSTOM_ENTRY_TYPE_NAME_MAX_LENGTH
        : CUSTOM_ENTRY_TYPE_FIELD_NAME_MAX_LENGTH,
    maxCount: CUSTOM_ENTRY_TYPE_MAX_FIELDS,
  });
}

/**
 * 把新建, 修改与删除类型失败的原因换成当前语言的文案.
 * @param reason 主进程报告的失败原因.
 * @param translate 翻译函数.
 * @returns 文案.
 */
export function describeCustomTypeFailure(
  reason: string,
  translate: TFunction,
): string {
  switch (reason) {
    case "invalid-input":
      return translate("entryCreate.customType.error.invalid");
    case "name-taken":
      return translate("entryCreate.customType.error.nameTaken");
    case "limit-reached":
      return translate("entryCreate.customType.error.limitReached", {
        maxCount: CUSTOM_ENTRY_TYPE_MAX_COUNT,
      });
    case "not-found":
      return translate("entryCreate.customType.error.notFound");
    default:
      return translate("entryCreate.customType.error.unexpected");
  }
}
