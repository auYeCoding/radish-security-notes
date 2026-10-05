import type { TFunction } from "i18next";

import { MAX_TRANSFER_ENTRIES } from "@shared/data-transfer/transfer-limits";
import { MAX_IMPORT_FILE_BYTES } from "@shared/import/import-limits";
import type {
  ImportFailure,
  ImportFailureReason,
} from "@shared/import/import-result";

/**
 * 每种失败原因对应的文案键.
 */
const FAILURE_MESSAGE_KEYS = {
  "vault-locked": "import.failure.vault-locked",
  "unexpected-error": "import.failure.unexpected-error",
  "invalid-input": "import.failure.invalid-input",
  busy: "import.failure.busy",
  "no-pending-import": "import.failure.no-pending-import",
  "file-unreadable": "import.failure.file-unreadable",
  "file-empty": "import.failure.file-empty",
  "file-too-large": "import.failure.file-too-large",
  "encoding-unsupported": "import.failure.encoding-unsupported",
  "format-mismatch": "import.failure.format-mismatch",
  "encrypted-file": "import.failure.encrypted-file",
  "organization-export-unsupported":
    "import.failure.organization-export-unsupported",
  "malformed-file": "import.failure.malformed-file",
  "too-many-entries": "import.failure.too-many-entries",
  "no-importable-entries": "import.failure.no-importable-entries",
  "save-failed": "import.failure.save-failed",
  "reveal-failed": "import.failure.reveal-failed",
} as const satisfies Record<ImportFailureReason, string>;

/**
 * 每兆字节的字节数, 把文件大小上限换成界面里写的 MiB.
 */
const BYTES_PER_MEBIBYTE = 1024 * 1024;

/**
 * 把导入失败的结果翻译成给用户看的文案: 文件格式错误带行号时用带行号的文案, 超限的失败写出上限.
 * @param failure 失败结果.
 * @param translate 翻译函数.
 * @returns 失败文案.
 */
export function describeImportFailure(
  failure: ImportFailure,
  translate: TFunction,
): string {
  if (failure.reason === "malformed-file" && failure.line !== undefined) {
    return translate("import.failure.malformed-file-at-line", {
      line: failure.line,
    });
  }
  return translate(FAILURE_MESSAGE_KEYS[failure.reason], {
    limit:
      failure.reason === "file-too-large"
        ? MAX_IMPORT_FILE_BYTES / BYTES_PER_MEBIBYTE
        : MAX_TRANSFER_ENTRIES,
  });
}
