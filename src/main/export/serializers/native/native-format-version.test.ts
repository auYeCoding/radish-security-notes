import { describe, expect, it } from "vitest";

import {
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
});
