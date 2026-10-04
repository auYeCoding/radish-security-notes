import { describe, expect, it } from "vitest";

import { foldText } from "./fold-text";
import {
  pinyinInitialsText,
  pinyinInitialsWithOrigins,
} from "./pinyin-initials";

describe("pinyinInitialsText", () => {
  it("汉字换成拼音首字母", () => {
    expect(pinyinInitialsText("邮箱")).toBe("yx");
    expect(pinyinInitialsText("淘宝")).toBe("tb");
  });

  it("中英混杂时英文规范化, 汉字取首字母", () => {
    expect(pinyinInitialsText("Gmail邮箱")).toBe("gmailyx");
  });

  it("多音字取运行环境排序数据里的固定读音", () => {
    expect(pinyinInitialsText("重庆")).toBe("zq");
  });

  it("没有汉字时与 foldText 一致", () => {
    expect(pinyinInitialsText("Éclair 1")).toBe(foldText("Éclair 1"));
    expect(pinyinInitialsText("")).toBe("");
  });

  it("没有拼音读音的汉字保持原样", () => {
    expect(pinyinInitialsText("𠀀")).toBe("𠀀");
  });
});

describe("pinyinInitialsWithOrigins", () => {
  it("首字母串与 pinyinInitialsText 一致", () => {
    expect(pinyinInitialsWithOrigins("Gmail邮箱").folded).toBe(
      pinyinInitialsText("Gmail邮箱"),
    );
  });

  it("每个首字母对应原文里的一个汉字", () => {
    const result = pinyinInitialsWithOrigins("a邮箱");

    expect(result.folded).toBe("ayx");
    expect(result.starts).toEqual([0, 1, 2]);
    expect(result.ends).toEqual([1, 2, 3]);
  });
});
