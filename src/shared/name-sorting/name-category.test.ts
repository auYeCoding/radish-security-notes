import { describe, expect, it } from "vitest";

import { NAME_CATEGORY, classifyName } from "./name-category";

describe("classifyName", () => {
  it("类别的先后是纯英文, 中英混杂, 纯中文", () => {
    expect(NAME_CATEGORY.english).toBeLessThan(NAME_CATEGORY.mixed);
    expect(NAME_CATEGORY.mixed).toBeLessThan(NAME_CATEGORY.chinese);
  });

  it("没有汉字的名称是纯英文", () => {
    expect(classifyName("Gmail")).toBe(NAME_CATEGORY.english);
  });

  it("纯数字与纯符号归纯英文", () => {
    expect(classifyName("123")).toBe(NAME_CATEGORY.english);
    expect(classifyName("!!!")).toBe(NAME_CATEGORY.english);
    expect(classifyName("😀")).toBe(NAME_CATEGORY.english);
  });

  it("假名, 西里尔字母与带重音的拉丁字母归英文一侧", () => {
    expect(classifyName("あい")).toBe(NAME_CATEGORY.english);
    expect(classifyName("жа")).toBe(NAME_CATEGORY.english);
    expect(classifyName("Éclair")).toBe(NAME_CATEGORY.english);
  });

  it("只有汉字的名称是纯中文", () => {
    expect(classifyName("邮箱")).toBe(NAME_CATEGORY.chinese);
  });

  it("汉字加符号仍是纯中文, 符号不参与判定", () => {
    expect(classifyName("备份(旧)")).toBe(NAME_CATEGORY.chinese);
    expect(classifyName("邮箱 😀")).toBe(NAME_CATEGORY.chinese);
  });

  it("汉字加字母或数字是中英混杂", () => {
    expect(classifyName("微信Pay")).toBe(NAME_CATEGORY.mixed);
    expect(classifyName("备份1")).toBe(NAME_CATEGORY.mixed);
    expect(classifyName("1号机")).toBe(NAME_CATEGORY.mixed);
  });

  it("汉字加假名是中英混杂", () => {
    expect(classifyName("あ邮")).toBe(NAME_CATEGORY.mixed);
  });

  it("汉字记号 〇 与汉字一样算汉字", () => {
    expect(classifyName("〇")).toBe(NAME_CATEGORY.chinese);
    expect(classifyName("〇a")).toBe(NAME_CATEGORY.mixed);
  });
});
