import { describe, expect, it } from "vitest";

import { defaultExportFileName } from "./export-file-name";

describe("导出默认文件名", () => {
  const date = new Date(2026, 9, 5, 23, 30);

  it("应用名, 本地日期与格式的扩展名", () => {
    expect(defaultExportFileName("native", false, date)).toBe(
      "radish-security-notes-2026-10-05.zip",
    );
    expect(defaultExportFileName("bitwardenJson", false, date)).toBe(
      "radish-security-notes-2026-10-05.json",
    );
    expect(defaultExportFileName("browserCsv", false, date)).toBe(
      "radish-security-notes-2026-10-05.csv",
    );
  });

  it("加密时再追加 .age", () => {
    expect(defaultExportFileName("native", true, date)).toBe(
      "radish-security-notes-2026-10-05.zip.age",
    );
  });

  it("日期按本地时区, 月日补零", () => {
    expect(
      defaultExportFileName("native", false, new Date(2026, 0, 3, 0, 5)),
    ).toBe("radish-security-notes-2026-01-03.zip");
  });
});
