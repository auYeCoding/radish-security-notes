import {
  FOLDER_NAME_ERROR_CODES,
  FOLDER_NAME_MAX_LENGTH,
} from "@shared/folders/folder-name-schema";
import type { FolderFailureReason } from "@shared/folders/folder-result";
import type { TFunction } from "i18next";

/**
 * 把文件夹名称的校验错误代码换成当前语言的文案.
 * @param code 校验消息, 由文件夹名称的校验方案产生.
 * @param translate 翻译函数.
 * @returns 文案, 不认识的代码返回 undefined.
 */
export function describeFolderNameError(
  code: string | undefined,
  translate: TFunction,
): string | undefined {
  switch (code) {
    case FOLDER_NAME_ERROR_CODES.nameRequired:
      return translate("folderName.error.nameRequired");
    case FOLDER_NAME_ERROR_CODES.nameTooLong:
      return translate("folderName.error.nameTooLong", {
        maxLength: FOLDER_NAME_MAX_LENGTH,
      });
    default:
      return undefined;
  }
}

/**
 * 把新建或重命名文件夹失败的原因换成当前语言的文案.
 * @param reason 主进程报告的失败原因.
 * @param translate 翻译函数.
 * @returns 文案.
 */
export function describeFolderNameFailure(
  reason: FolderFailureReason,
  translate: TFunction,
): string {
  switch (reason) {
    case "name-taken":
      return translate("folderName.error.nameTaken");
    case "invalid-input":
      return translate("folderName.error.invalid");
    case "not-found":
      return translate("folderName.error.notFound");
    default:
      return translate("folderName.error.unexpected");
  }
}
