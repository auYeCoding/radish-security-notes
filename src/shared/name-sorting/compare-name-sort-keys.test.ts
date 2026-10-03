import { describe, expect, it } from "vitest";

import { compareNameSortKeys } from "./compare-name-sort-keys";
import { buildNameSortKey } from "./name-sort-key";

/**
 * 比较两个名称的排序键.
 * @param first 第一个名称.
 * @param second 第二个名称.
 * @returns 比较结果.
 */
function compareNames(first: string, second: string): number {
  return compareNameSortKeys(buildNameSortKey(first), buildNameSortKey(second));
}

describe("compareNameSortKeys", () => {
  it("类别不同先比类别", () => {
    expect(compareNames("zzzz", "邮")).toBeLessThan(0);
    expect(compareNames("邮", "zzzz")).toBeGreaterThan(0);
  });

  it("类别相同比字符个数", () => {
    expect(compareNames("zz", "aaa")).toBeLessThan(0);
  });

  it("长度相同比开头分组, 再比组内次序", () => {
    expect(compareNames("_ab", "1ab")).toBeLessThan(0);
    expect(compareNames("1ab", "aab")).toBeLessThan(0);
    expect(compareNames("aab", "bab")).toBeLessThan(0);
    expect(compareNames("bab", "兙ab")).toBeLessThan(0);
  });

  it("数字组按整数值比较", () => {
    expect(compareNames("9abc", "12ab")).toBeLessThan(0);
  });

  it("全部相同时为 0", () => {
    expect(compareNames("Apple", "apple")).toBe(0);
    expect(compareNames("Apple", "Alpha")).toBe(0);
  });
});
