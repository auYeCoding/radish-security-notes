import { describe, expect, it } from "vitest";

import { foldForComparison, isSameName } from "./is-same-name";

describe("foldForComparison", () => {
  it("去首尾空格并只把 A-Z 折成小写, 同名判断与按名称建索引共用它", () => {
    expect(foldForComparison("  Work ")).toBe("work");
    expect(foldForComparison("École")).toBe("École");
    expect(foldForComparison("Ａ")).toBe("Ａ");
    expect(isSameName("Work", "work")).toBe(
      foldForComparison("Work") === foldForComparison("work"),
    );
  });
});

describe("isSameName", () => {
  it("去首尾空格后忽略英文大小写, 相同即同名", () => {
    expect(isSameName("Work", "work")).toBe(true);
    expect(isSameName("  Work ", "WORK")).toBe(true);
    expect(isSameName("工作", " 工作 ")).toBe(true);
  });

  it("非英文字母的大小写不同时不算同名", () => {
    expect(isSameName("École", "école")).toBe(false);
    expect(isSameName("Дом", "дом")).toBe(false);
    expect(isSameName("Ａ", "ａ")).toBe(false);
  });

  it("名称不同, 或中间空格不同时不算同名", () => {
    expect(isSameName("Work", "Works")).toBe(false);
    expect(isSameName("my work", "mywork")).toBe(false);
  });
});
