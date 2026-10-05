import { describe, expect, it } from "vitest";

import {
  ExportAttachmentMissingError,
  ExportCancelledError,
} from "./export-errors";
import { failureReasonOf, isExportCancellation } from "./export-failure";

describe("导出错误的归类", () => {
  it("取消错误与中止错误算取消, 其余不算", () => {
    expect(isExportCancellation(new ExportCancelledError())).toBe(true);
    expect(
      isExportCancellation(
        Object.assign(new Error("aborted"), { name: "AbortError" }),
      ),
    ).toBe(true);
    expect(isExportCancellation(new Error("磁盘已满"))).toBe(false);
    expect(isExportCancellation("cancel")).toBe(false);
  });

  it("附件缺失, 文件系统错误与意外失败各有原因", () => {
    expect(failureReasonOf(new ExportAttachmentMissingError())).toBe(
      "attachment-missing",
    );
    for (const code of ["EACCES", "ENOSPC", "EPERM", "EISDIR", "EBUSY"]) {
      expect(failureReasonOf(Object.assign(new Error("x"), { code }))).toBe(
        "write-failed",
      );
    }
    expect(failureReasonOf(new Error("别的错误"))).toBe("unexpected-error");
    expect(failureReasonOf(Object.assign(new Error("x"), { code: 5 }))).toBe(
      "unexpected-error",
    );
    expect(failureReasonOf("字符串")).toBe("unexpected-error");
  });

  it("错误的名称与信息不含任何内容", () => {
    expect(new ExportAttachmentMissingError().message).toBe(
      "导出途中附件已不存在",
    );
    expect(new ExportCancelledError().name).toBe("ExportCancelledError");
  });
});
