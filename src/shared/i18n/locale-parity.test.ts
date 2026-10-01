import { describe, expect, it } from "vitest";

import en from "../locales/en.json";
import zh from "../locales/zh.json";

/**
 * 递归收集对象中全部叶子节点的点分路径.
 * @param node 待遍历的对象.
 * @param prefix 当前路径前缀.
 * @returns 排好序的叶子路径.
 */
function collectLeafPaths(node: object, prefix = ""): string[] {
  return Object.entries(node)
    .flatMap(([key, value]) => {
      const path = prefix === "" ? key : `${prefix}.${key}`;
      return typeof value === "object" && value !== null
        ? collectLeafPaths(value, path)
        : [path];
    })
    .sort();
}

describe("语言资源", () => {
  it("中文与英文的翻译键完全一致", () => {
    expect(collectLeafPaths(en)).toEqual(collectLeafPaths(zh));
  });
});
