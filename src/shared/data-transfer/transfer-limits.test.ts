import { describe, expect, it } from "vitest";

import { MAX_TRANSFER_ENTRIES } from "./transfer-limits";

describe("导出与导入共用的限制", () => {
  it("一次最多 10000 条条目", () => {
    expect(MAX_TRANSFER_ENTRIES).toBe(10000);
  });
});
