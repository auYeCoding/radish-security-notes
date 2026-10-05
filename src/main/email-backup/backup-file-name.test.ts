import { describe, expect, it } from "vitest";

import { backupFileName } from "./backup-file-name";

describe("邮箱备份文件名", () => {
  const date = new Date(2026, 9, 5, 20, 30);

  it("明文备份是应用名, backup, 本地日期与 zip 扩展名", () => {
    expect(backupFileName(false, date)).toBe(
      "radish-security-notes-backup-2026-10-05.zip",
    );
  });

  it("加密备份再追加 age 扩展名", () => {
    expect(backupFileName(true, date)).toBe(
      "radish-security-notes-backup-2026-10-05.zip.age",
    );
  });
});
