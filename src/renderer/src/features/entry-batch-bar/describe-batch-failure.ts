import type { BatchFailureReason } from "@shared/batch/batch-result";
import { MAX_TAGS_PER_ENTRY } from "@shared/tags/tag-limits";
import type { TFunction } from "i18next";

/**
 * 把批量操作失败的原因换成当前语言的文案, 文案都说明操作没有执行.
 * @param reason 主进程报告的失败原因.
 * @param translate 翻译函数.
 * @returns 文案.
 */
export function describeBatchFailure(
  reason: BatchFailureReason,
  translate: TFunction,
): string {
  switch (reason) {
    case "not-found":
      return translate("batch.error.notFound");
    case "folder-not-found":
      return translate("batch.error.folderNotFound");
    case "tag-not-found":
      return translate("batch.error.tagNotFound");
    case "tag-limit-exceeded":
      return translate("batch.error.tagLimit", { max: MAX_TAGS_PER_ENTRY });
    case "invalid-input":
      return translate("batch.error.invalidInput");
    default:
      return translate("batch.error.unexpected");
  }
}
