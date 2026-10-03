import type { EntryFailureReason } from "@shared/entries/entry-result";
import type { TFunction } from "i18next";

/**
 * 把编辑保存失败的原因换成当前语言的文案.
 * @param reason 主进程报告的失败原因.
 * @param translate 翻译函数.
 * @returns 文案.
 */
export function describeEditFailure(
  reason: EntryFailureReason,
  translate: TFunction,
): string {
  switch (reason) {
    case "invalid-input":
      return translate("entryEdit.error.invalid");
    case "not-found":
      return translate("entryEdit.error.notFound");
    case "folder-not-found":
      return translate("entryEdit.error.folderNotFound");
    default:
      return translate("entryEdit.error.unexpected");
  }
}
