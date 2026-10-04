import { describe, expect, it } from "vitest";

import { convertWithOrigins, foldText, foldTextWithOrigins } from "./fold-text";

describe("foldText", () => {
  it("转成小写", () => {
    expect(foldText("GitHub")).toBe("github");
  });

  it("去掉重音", () => {
    expect(foldText("Éclair Crème")).toBe("eclair creme");
  });

  it("全角字母与数字变成半角", () => {
    expect(foldText("ＡＢＣ１２３")).toBe("abc123");
  });

  it("兼容连字拆成字母, 汉字保持不变", () => {
    expect(foldText("ﬁ")).toBe("fi");
    expect(foldText("邮箱")).toBe("邮箱");
  });

  it("空串还是空串", () => {
    expect(foldText("")).toBe("");
  });
});

describe("foldTextWithOrigins", () => {
  it.each(["GitHub", "Éclair", "ＡＢＣ１２３", "邮箱 Mail", "ﬁne", "😀a", ""])(
    "规范化文本与 foldText 一致: %s",
    (text) => {
      expect(foldTextWithOrigins(text).folded).toBe(foldText(text));
    },
  );

  it("去掉重音的字符对应原文里的整个字符", () => {
    const result = foldTextWithOrigins("Éa");

    expect(result.starts).toEqual([0, 1]);
    expect(result.ends).toEqual([1, 2]);
  });

  it("一个字符拆成多个字符时都对应原来的字符", () => {
    const result = foldTextWithOrigins("ﬁx");

    expect(result.folded).toBe("fix");
    expect(result.starts).toEqual([0, 0, 1]);
    expect(result.ends).toEqual([1, 1, 2]);
  });

  it("表情占两个 UTF-16 单元, 区间按单元计", () => {
    const result = foldTextWithOrigins("😀a");

    expect(result.starts).toEqual([0, 0, 2]);
    expect(result.ends).toEqual([2, 2, 3]);
  });
});

describe("convertWithOrigins", () => {
  it("按给定的转换逐字符生成文本, 转成空串的字符被去掉", () => {
    const result = convertWithOrigins("a-b", (character) =>
      character === "-" ? "" : character.toUpperCase(),
    );

    expect(result.folded).toBe("AB");
    expect(result.starts).toEqual([0, 2]);
    expect(result.ends).toEqual([1, 3]);
  });
});
