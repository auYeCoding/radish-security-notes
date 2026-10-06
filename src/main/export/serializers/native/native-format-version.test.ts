import { describe, expect, it } from "vitest";

import {
  attachmentIdOfPath,
  isNativeAttachmentId,
  NATIVE_FORMAT_ID,
  NATIVE_FORMAT_VERSION,
  nativeAttachmentPath,
} from "./native-format-version";

describe("本应用格式的版本与路径", () => {
  it("格式标识与版本号", () => {
    expect(NATIVE_FORMAT_ID).toBe("radish-security-notes-export");
    expect(NATIVE_FORMAT_VERSION).toBe(1);
  });

  it("附件路径用编号命名, 放在 attachments 目录下", () => {
    expect(nativeAttachmentPath("att-1")).toBe("attachments/att-1");
    expect(nativeAttachmentPath("0b9f3b7e-1c1c-4a53-8f5a-3f6d9d2c6a11")).toBe(
      "attachments/0b9f3b7e-1c1c-4a53-8f5a-3f6d9d2c6a11",
    );
  });

  it("编号含路径分隔符, 点号或空串时拒绝", () => {
    for (const unsafe of ["../x", "a/b", "a\\b", "a.b", "", "a b"]) {
      expect(() => nativeAttachmentPath(unsafe)).toThrow(
        "附件编号含有不能用作文件名的字符",
      );
    }
  });

  it("附件编号只允许字母, 数字, 下划线与连字符", () => {
    expect(isNativeAttachmentId("att-1_A")).toBe(true);
    for (const unsafe of ["../x", "a/b", "a\\b", "a.b", "", "a b"]) {
      expect(isNativeAttachmentId(unsafe)).toBe(false);
    }
  });

  it("由附件路径取回编号, 是 nativeAttachmentPath 的逆运算", () => {
    expect(attachmentIdOfPath(nativeAttachmentPath("att-1"))).toBe("att-1");
  });

  it("不在附件目录下, 编号不合规或嵌套的路径取不出编号", () => {
    for (const path of [
      "manifest.json",
      "attachments/",
      "attachments/a/b",
      "attachments/../x",
      "attachments/a.b",
      "Attachments/a",
      "/attachments/a",
    ]) {
      expect(attachmentIdOfPath(path)).toBeUndefined();
    }
  });
});
