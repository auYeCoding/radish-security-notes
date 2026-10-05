import { describe, expect, it } from "vitest";

import { importFailed } from "./import-result";
import { isNotImportedReason, NOT_IMPORTED_REASONS } from "./import-reasons";
import {
  DEFAULT_DUPLICATE_POLICY,
  isImportDuplicatePolicy,
} from "./import-types";

describe("导入的共享取值", () => {
  it("重复条目的默认处理是跳过", () => {
    expect(DEFAULT_DUPLICATE_POLICY).toBe("skip");
    expect(isImportDuplicatePolicy("skip")).toBe(true);
    expect(isImportDuplicatePolicy("import")).toBe(true);
    expect(isImportDuplicatePolicy("overwrite")).toBe(false);
  });

  it("原因代码判断只认登记过的代码", () => {
    for (const reason of NOT_IMPORTED_REASONS) {
      expect(isNotImportedReason(reason)).toBe(true);
    }
    expect(isNotImportedReason("unknown")).toBe(false);
  });

  it("失败结果可带行号, 不带时没有这一项", () => {
    expect(importFailed("malformed-file", 7)).toEqual({
      ok: false,
      reason: "malformed-file",
      line: 7,
    });
    expect(importFailed("file-empty")).toEqual({
      ok: false,
      reason: "file-empty",
    });
  });
});
