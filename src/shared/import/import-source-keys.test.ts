import { describe, expect, it } from "vitest";

import {
  describeImportSource,
  IMPORT_FILE_EXTENSIONS,
  IMPORT_SOURCE_KEYS,
  IMPORT_SOURCES,
  isImportSourceKey,
} from "./import-source-keys";

describe("导入来源的键", () => {
  it("登记表与键列表一一对应", () => {
    expect(IMPORT_SOURCES.map((source) => source.key)).toEqual([
      ...IMPORT_SOURCE_KEYS,
    ]);
  });

  it("来源键互不相同", () => {
    expect(new Set(IMPORT_SOURCE_KEYS).size).toBe(IMPORT_SOURCE_KEYS.length);
  });

  it("每个键都能取到描述, 文件种类都有扩展名", () => {
    for (const key of IMPORT_SOURCE_KEYS) {
      const source = describeImportSource(key);
      expect(source.key).toBe(key);
      expect(IMPORT_FILE_EXTENSIONS[source.fileKind].length).toBeGreaterThan(0);
    }
  });

  it("只有登记过的键通过判断", () => {
    expect(isImportSourceKey("bitwardenJson")).toBe(true);
    expect(isImportSourceKey("lastpassCsv")).toBe(false);
    expect(isImportSourceKey(undefined)).toBe(false);
    expect(isImportSourceKey(1)).toBe(false);
  });

  it("Bitwarden JSON 是 json, 其余三种是 csv", () => {
    expect(describeImportSource("bitwardenJson").fileKind).toBe("json");
    expect(describeImportSource("bitwardenCsv").fileKind).toBe("csv");
    expect(describeImportSource("browserCsv").fileKind).toBe("csv");
    expect(describeImportSource("keepassxcCsv").fileKind).toBe("csv");
  });
});
