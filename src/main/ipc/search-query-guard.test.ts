import { describe, expect, it } from "vitest";

import { requireSearchQuery } from "./search-query-guard";

describe("requireSearchQuery", () => {
  it("字符串原样通过, 包括空串", () => {
    expect(requireSearchQuery("github 工作")).toBe("github 工作");
    expect(requireSearchQuery("")).toBe("");
  });

  it("不是字符串时抛出错误", () => {
    for (const value of [undefined, null, 1, {}, ["a"]]) {
      expect(() => requireSearchQuery(value)).toThrow("无效的搜索关键字");
    }
  });
});
