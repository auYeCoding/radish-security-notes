import type { EntryFailureReason } from "@shared/entries/entry-result";
import type { TFunction } from "i18next";

/**
 * 把新建失败的原因换成当前语言的文案.
 * @param reason 主进程报告的失败原因.
 * @param translate 翻译函数.
 * @returns 文案.
 */
export function describeCreateFailure(
  reason: EntryFailureReason,
  translate: TFunction,
): string {
  switch (reason) {
    case "invalid-input":
      return translate("entryCreate.error.invalid");
    case "folder-not-found":
      return translate("entryCreate.error.folderNotFound");
    default:
      return translate("entryCreate.error.unexpected");
  }
}
