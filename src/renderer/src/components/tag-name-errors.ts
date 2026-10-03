import type { TagFailureReason } from "@shared/tags/tag-result";
import {
  TAG_NAME_ERROR_CODES,
  TAG_NAME_MAX_LENGTH,
} from "@shared/tags/tag-name-schema";
import type { TFunction } from "i18next";

/**
 * 把标签名称的校验错误代码换成当前语言的文案.
 * @param code 校验消息, 由标签表单的校验方案产生.
 * @param translate 翻译函数.
 * @returns 文案, 不认识的代码返回 undefined.
 */
export function describeTagNameError(
  code: string | undefined,
  translate: TFunction,
): string | undefined {
  switch (code) {
    case TAG_NAME_ERROR_CODES.nameRequired:
      return translate("tagName.error.nameRequired");
    case TAG_NAME_ERROR_CODES.nameTooLong:
      return translate("tagName.error.nameTooLong", {
        maxLength: TAG_NAME_MAX_LENGTH,
      });
    default:
      return undefined;
  }
}

/**
 * 把新建或编辑标签失败的原因换成当前语言的文案.
 * @param reason 主进程报告的失败原因.
 * @param translate 翻译函数.
 * @returns 文案.
 */
export function describeTagFailure(
  reason: TagFailureReason,
  translate: TFunction,
): string {
  switch (reason) {
    case "name-taken":
      return translate("tagName.error.nameTaken");
    case "invalid-input":
      return translate("tagName.error.invalid");
    case "not-found":
      return translate("tagName.error.notFound");
    default:
      return translate("tagName.error.unexpected");
  }
}
