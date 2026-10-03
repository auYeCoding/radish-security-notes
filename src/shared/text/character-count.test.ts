import { describe, expect, it } from "vitest";

import { countCharacters } from "./character-count";

describe("countCharacters", () => {
  it("中英文同算, 一个字符算一个", () => {
    expect(countCharacters("Gmail")).toBe(5);
    expect(countCharacters("邮箱账号")).toBe(4);
    expect(countCharacters("微信Pay")).toBe(5);
  });

  it("一个表情算一个字符, 不按 UTF-16 码元数", () => {
    expect(countCharacters("a😀")).toBe(2);
    expect("a😀".length).toBe(3);
  });

  it("空文本是零个字符", () => {
    expect(countCharacters("")).toBe(0);
  });
});
