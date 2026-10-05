import { describe, expect, it } from "vitest";

import { duplicateKeyOf } from "./import-duplicate-key";

describe("重复判定键", () => {
  it("名称, 账号, 网址都相同时键相同, 忽略英文大小写与首尾空格", () => {
    const first = duplicateKeyOf("GitHub", {
      account: "Alice",
      url: "https://github.com",
    });
    const second = duplicateKeyOf(" github ", {
      account: " alice",
      url: "HTTPS://GITHUB.com ",
    });
    expect(first).toBe(second);
  });

  it("任何一项不同键就不同", () => {
    const base = { account: "alice", url: "https://a.example" };
    const key = duplicateKeyOf("甲", base);
    expect(duplicateKeyOf("乙", base)).not.toBe(key);
    expect(duplicateKeyOf("甲", { ...base, account: "bob" })).not.toBe(key);
    expect(
      duplicateKeyOf("甲", { ...base, url: "https://b.example" }),
    ).not.toBe(key);
  });

  it("类型没有账号或网址字段时该项视为空", () => {
    expect(duplicateKeyOf("笔记", { content: "正文" })).toBe(
      duplicateKeyOf("笔记", { account: "", url: "" }),
    );
  });

  it("各部分之间有分隔, 不会因拼接而串键", () => {
    expect(duplicateKeyOf("ab", { account: "c", url: "" })).not.toBe(
      duplicateKeyOf("a", { account: "bc", url: "" }),
    );
  });
});
