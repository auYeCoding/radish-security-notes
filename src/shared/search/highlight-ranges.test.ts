import { describe, expect, it } from "vitest";

import { highlightRanges, splitByRanges } from "./highlight-ranges";

describe("highlightRanges", () => {
  it("每个词的命中处都要高亮, 忽略大小写", () => {
    expect(
      highlightRanges("GitHub Work", ["git", "work"], { withPinyin: false }),
    ).toEqual([
      { start: 0, end: 3 },
      { start: 7, end: 11 },
    ]);
  });

  it("重叠或相接的命中区间合并成一个", () => {
    expect(
      highlightRanges("abcd", ["ab", "bc", "cd"], { withPinyin: false }),
    ).toEqual([{ start: 0, end: 4 }]);
  });

  it("开启拼音时首字母的命中处也高亮", () => {
    expect(highlightRanges("邮箱 Mail", ["yx"], { withPinyin: true })).toEqual([
      { start: 0, end: 2 },
    ]);
  });

  it("没有开启拼音时首字母不命中", () => {
    expect(highlightRanges("邮箱", ["yx"], { withPinyin: false })).toEqual([]);
  });

  it("汉字本身的命中不依赖拼音", () => {
    expect(highlightRanges("邮箱", ["箱"], { withPinyin: false })).toEqual([
      { start: 1, end: 2 },
    ]);
  });

  it("没有词时没有区间", () => {
    expect(highlightRanges("abc", [], { withPinyin: true })).toEqual([]);
  });
});

describe("splitByRanges", () => {
  it("按区间切成命中与非命中的片段, 连起来等于原文", () => {
    const segments = splitByRanges("GitHub Work", [
      { start: 0, end: 3 },
      { start: 7, end: 11 },
    ]);

    expect(segments).toEqual([
      { text: "Git", isMatch: true },
      { text: "Hub ", isMatch: false },
      { text: "Work", isMatch: true },
    ]);
  });

  it("命中在中间时前后都有非命中片段", () => {
    expect(splitByRanges("abcde", [{ start: 1, end: 3 }])).toEqual([
      { text: "a", isMatch: false },
      { text: "bc", isMatch: true },
      { text: "de", isMatch: false },
    ]);
  });

  it("没有区间时整段是非命中片段, 原文为空时没有片段", () => {
    expect(splitByRanges("abc", [])).toEqual([{ text: "abc", isMatch: false }]);
    expect(splitByRanges("", [])).toEqual([]);
  });
});
