import { describe, expect, it } from "vitest";

import { isHanCharacter } from "./is-han-character";

describe("isHanCharacter", () => {
  it("基本区, 扩展区与汉字记号都算汉字", () => {
    expect(isHanCharacter("邮")).toBe(true);
    expect(isHanCharacter("𠀀")).toBe(true);
    expect(isHanCharacter("〇")).toBe(true);
    expect(isHanCharacter("々")).toBe(true);
  });

  it("字母, 数字, 符号, 假名与表情不是汉字", () => {
    expect(isHanCharacter("a")).toBe(false);
    expect(isHanCharacter("1")).toBe(false);
    expect(isHanCharacter("_")).toBe(false);
    expect(isHanCharacter("あ")).toBe(false);
    expect(isHanCharacter("😀")).toBe(false);
  });
});
