import type { TFunction } from "i18next";

import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_ENTRY,
  MAX_ENTRY_ATTACHMENT_BYTES,
} from "@shared/attachments/attachment-limits";
import type {
  AttachmentFailure,
  AttachmentFailureReason,
} from "@shared/attachments/attachment-result";

import { formatByteSize } from "@renderer/components/format-byte-size";

/**
 * 每种失败原因对应的文案键.
 */
const FAILURE_MESSAGE_KEYS = {
  "vault-locked": "entryAttachments.error.unexpected",
  "unexpected-error": "entryAttachments.error.unexpected",
  "invalid-input": "entryAttachments.error.invalidInput",
  "not-found": "entryAttachments.error.notFound",
  "empty-file": "entryAttachments.error.emptyFile",
  "file-too-large": "entryAttachments.error.fileTooLarge",
  "too-many-attachments": "entryAttachments.error.tooManyAttachments",
  "total-too-large": "entryAttachments.error.totalTooLarge",
  "not-a-file": "entryAttachments.error.notAFile",
  "read-failed": "entryAttachments.error.readFailed",
  "write-failed": "entryAttachments.error.writeFailed",
  "not-openable": "entryAttachments.error.notOpenable",
  "not-previewable": "entryAttachments.error.notPreviewable",
  "open-failed": "entryAttachments.error.openFailed",
} as const satisfies Record<AttachmentFailureReason, string>;

/**
 * 把附件操作失败的结果翻译成给用户看的文案, 与具体文件有关的失败带上文件名.
 * @param failure 失败结果.
 * @param translate 翻译函数.
 * @param language 当前界面语言, 决定大小上限里数字的写法.
 * @returns 失败文案.
 */
export function describeAttachmentFailure(
  failure: AttachmentFailure,
  translate: TFunction,
  language: string,
): string {
  return translate(FAILURE_MESSAGE_KEYS[failure.reason], {
    name: failure.fileName ?? "",
    max: MAX_ATTACHMENTS_PER_ENTRY,
    fileLimit: formatByteSize(MAX_ATTACHMENT_BYTES, translate, language),
    totalLimit: formatByteSize(MAX_ENTRY_ATTACHMENT_BYTES, translate, language),
  });
}
