import type { TFunction } from "i18next";

import { MAX_EXPORT_ENTRIES } from "@shared/export/export-limits";
import type {
  ExportFailure,
  ExportFailureReason,
} from "@shared/export/export-result";

/**
 * 每种失败原因对应的文案键.
 */
const FAILURE_MESSAGE_KEYS = {
  "vault-locked": "export.failure.vault-locked",
  "unexpected-error": "export.failure.unexpected-error",
  "invalid-input": "export.failure.invalid-input",
  busy: "export.failure.busy",
  "too-many-entries": "export.failure.too-many-entries",
  "no-entries": "export.failure.no-entries",
  "wrong-master-password": "export.failure.wrong-master-password",
  "invalid-passphrase": "export.failure.invalid-passphrase",
  "plaintext-not-acknowledged": "export.failure.plaintext-not-acknowledged",
  "write-failed": "export.failure.write-failed",
  "attachment-missing": "export.failure.attachment-missing",
  "no-finished-export": "export.failure.no-finished-export",
  "reveal-failed": "export.failure.reveal-failed",
} as const satisfies Record<ExportFailureReason, string>;

/**
 * 把导出失败的结果翻译成给用户看的文案, 超限的失败写出上限.
 * @param failure 失败结果.
 * @param translate 翻译函数.
 * @returns 失败文案.
 */
export function describeExportFailure(
  failure: ExportFailure,
  translate: TFunction,
): string {
  return translate(FAILURE_MESSAGE_KEYS[failure.reason], {
    limit: MAX_EXPORT_ENTRIES,
  });
}
