import { describe, expect, it } from "vitest";

import { parseSearchQuery } from "./parse-search-query";

describe("parseSearchQuery", () => {
  it("按空白拆成词, 去首尾空格", () => {
    expect(parseSearchQuery("  github   工作 ")).toEqual(["github", "工作"]);
  });

  it("全角空格也算分隔", () => {
    expect(parseSearchQuery("github　工作")).toEqual(["github", "工作"]);
  });

  it("每个词规范化: 小写, 去重音, 全角变半角", () => {
    expect(parseSearchQuery("Éclair ＡＢＣ")).toEqual(["eclair", "abc"]);
  });

  it("重复的词只留一个, 保持先后", () => {
    expect(parseSearchQuery("b a B a")).toEqual(["b", "a"]);
  });

  it("空串与只有空白时没有词", () => {
    expect(parseSearchQuery("")).toEqual([]);
    expect(parseSearchQuery("   ")).toEqual([]);
  });

  it("规范化后为空的词被丢弃", () => {
    expect(parseSearchQuery("́ a")).toEqual(["a"]);
  });
});
