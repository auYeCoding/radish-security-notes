import { describe, expect, it } from "vitest";

import { NAME_START_GROUP, readNameStart } from "./name-start";

describe("readNameStart 的字母与汉字", () => {
  it("英文字母取字母序号, 不分大小写", () => {
    expect(readNameStart("apple")).toEqual({
      group: NAME_START_GROUP.letter,
      rank: 0,
      digits: "",
    });
    expect(readNameStart("Zoom")).toEqual({
      group: NAME_START_GROUP.letter,
      rank: 25,
      digits: "",
    });
  });

  it("带重音的字母去掉重音, 全角字母变半角", () => {
    expect(readNameStart("Éclair")).toEqual(readNameStart("eclair"));
    expect(readNameStart("Ｂx")).toEqual(readNameStart("bx"));
  });

  it("汉字取拼音首字母, 与字母同在字母组", () => {
    expect(readNameStart("邮箱")).toEqual({
      group: NAME_START_GROUP.letter,
      rank: 24,
      digits: "",
    });
    expect(readNameStart("阿里")).toEqual(readNameStart("apple"));
  });

  it("没有拼音读音的汉字归没有拼音组", () => {
    const expected = { group: NAME_START_GROUP.noPinyin, rank: 0, digits: "" };

    expect(readNameStart("兙")).toEqual(expected);
    expect(readNameStart("𠀀")).toEqual(expected);
    expect(readNameStart("々")).toEqual(expected);
  });

  it("兼容汉字先变成统一汉字再取拼音首字母", () => {
    expect(readNameStart("豈")).toEqual(readNameStart("豈"));
  });
});

describe("readNameStart 的数字与符号", () => {
  it("数字取开头连续的数字串, 全角数字变半角", () => {
    expect(readNameStart("12ab")).toEqual({
      group: NAME_START_GROUP.digit,
      rank: 0,
      digits: "12",
    });
    expect(readNameStart("１２ab")).toEqual(readNameStart("12ab"));
    expect(readNameStart("1号机")).toEqual({
      group: NAME_START_GROUP.digit,
      rank: 0,
      digits: "1",
    });
  });

  it("符号, 表情与其它文字取第一个字符的码点", () => {
    expect(readNameStart("_tmp")).toEqual({
      group: NAME_START_GROUP.symbol,
      rank: "_".codePointAt(0),
      digits: "",
    });
    expect(readNameStart("😀a")).toEqual({
      group: NAME_START_GROUP.symbol,
      rank: "😀".codePointAt(0),
      digits: "",
    });
    expect(readNameStart("あい").group).toBe(NAME_START_GROUP.symbol);
  });

  it("分组的先后是符号, 数字, 字母, 没有拼音", () => {
    expect(NAME_START_GROUP.symbol).toBeLessThan(NAME_START_GROUP.digit);
    expect(NAME_START_GROUP.digit).toBeLessThan(NAME_START_GROUP.letter);
    expect(NAME_START_GROUP.letter).toBeLessThan(NAME_START_GROUP.noPinyin);
  });

  it("空名称排在符号组最前", () => {
    expect(readNameStart("")).toEqual({
      group: NAME_START_GROUP.symbol,
      rank: 0,
      digits: "",
    });
  });
});
