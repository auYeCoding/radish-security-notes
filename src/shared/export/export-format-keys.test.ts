import { describe, expect, it } from "vitest";

import {
  DEFAULT_EXPORT_FORMAT,
  EXPORT_FORMAT_KEYS,
  isExportFormatKey,
} from "./export-format-keys";

describe("导出格式的键", () => {
  it("三种格式, 键互不相同", () => {
    expect([...EXPORT_FORMAT_KEYS]).toEqual([
      "native",
      "bitwardenJson",
      "browserCsv",
    ]);
    expect(new Set(EXPORT_FORMAT_KEYS).size).toBe(EXPORT_FORMAT_KEYS.length);
  });

  it("默认格式是本应用完整格式", () => {
    expect(DEFAULT_EXPORT_FORMAT).toBe("native");
  });

  it("只有登记过的键通过判断", () => {
    expect(isExportFormatKey("native")).toBe(true);
    expect(isExportFormatKey("bitwardenJson")).toBe(true);
    expect(isExportFormatKey("browserCsv")).toBe(true);
    expect(isExportFormatKey("keepassCsv")).toBe(false);
    expect(isExportFormatKey(undefined)).toBe(false);
    expect(isExportFormatKey(2)).toBe(false);
  });
});
