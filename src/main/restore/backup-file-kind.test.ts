import { describe, expect, it } from "vitest";

import { detectBackupFileKind } from "./backup-file-kind";

describe("按文件开头判断备份文件的种类", () => {
  it("压缩包魔数是 zip", () => {
    expect(detectBackupFileKind(Buffer.from([0x50, 0x4b, 0x03, 0x04, 1]))).toBe(
      "zip",
    );
  });

  it("age 二进制格式的版本声明是 encrypted", () => {
    expect(
      detectBackupFileKind(
        Buffer.from("age-encryption.org/v1\n-> scrypt abc 18\n", "ascii"),
      ),
    ).toBe("encrypted");
  });

  it("其它内容, 空文件与过短的文件都是 unknown", () => {
    for (const head of [
      Buffer.from("hello world"),
      Buffer.alloc(0),
      Buffer.from([0x50, 0x4b]),
      Buffer.from("age-encryption.org/v1", "ascii"),
      Buffer.from("-----BEGIN AGE ENCRYPTED FILE-----\n", "ascii"),
    ]) {
      expect(detectBackupFileKind(head)).toBe("unknown");
    }
  });

  it("不看扩展名, 只看内容", () => {
    expect(detectBackupFileKind(Buffer.from("PK\u0003\u0004", "latin1"))).toBe(
      "zip",
    );
  });
});
