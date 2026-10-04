import { describe, expect, it } from "vitest";

import type { EntrySearchDocument } from "./entry-search-types";
import { matchEntryDocument } from "./match-entry-document";
import { parseSearchQuery } from "./parse-search-query";

/**
 * 测试用的搜索文档: 每类参与搜索的字段里放一个互不相同的词.
 */
const DOCUMENT: EntrySearchDocument = {
  id: "entry-1",
  name: "Gmail 邮箱",
  fields: {
    account: "alice@example.com",
    url: "https://mail.example.com/login",
    email: "backup@example.org",
  },
  notes: "recovery number is 12345",
  customFieldLabels: ["Security Question", "Pet Name"],
  tagNames: ["工作", "Personal"],
};

/**
 * 用关键字搜索测试文档.
 * @param query 搜索栏里的关键字.
 * @returns 命中的字段, 不命中时为 undefined.
 */
function matchFields(query: string): readonly string[] | undefined {
  return matchEntryDocument(DOCUMENT, parseSearchQuery(query));
}

describe("matchEntryDocument 的字段命中", () => {
  it.each([
    ["gmail", "name"],
    ["alice@", "account"],
    ["mail.example.com/login", "url"],
    ["backup@", "email"],
    ["recovery number", "notes"],
    ["security question", "customFieldLabel"],
    ["personal", "tag"],
    ["工作", "tag"],
  ])("关键字 %s 命中 %s", (query, field) => {
    expect(matchFields(query)).toContain(field);
  });

  it("命中的字段只含真正命中的", () => {
    expect(matchFields("alice")).toEqual(["account"]);
  });

  it("多个字段都含关键字时全部列出, 按名称, 类型字段, 备注, 自定义字段名, 标签名的顺序", () => {
    expect(matchFields("mail")).toEqual(["name", "url"]);
    expect(matchFields("example")).toEqual(["account", "url", "email"]);
  });

  it("没有任何字段含关键字时不命中", () => {
    expect(matchFields("nonexistent")).toBeUndefined();
  });
});

describe("matchEntryDocument 的匹配方式", () => {
  it("忽略大小写", () => {
    expect(matchFields("GMAIL")).toEqual(["name"]);
  });

  it("忽略重音与全半角", () => {
    const document: EntrySearchDocument = {
      ...DOCUMENT,
      name: "Éclair",
      notes: "ＡＢＣ１２３",
    };

    expect(matchEntryDocument(document, parseSearchQuery("eclair"))).toEqual([
      "name",
    ]);
    expect(matchEntryDocument(document, parseSearchQuery("abc123"))).toEqual([
      "notes",
    ]);
  });

  it("多个词要同时满足, 可以命中不同字段", () => {
    expect(matchFields("gmail 工作")).toEqual(["name", "tag"]);
    expect(matchFields("gmail alice")).toEqual(["name", "account"]);
  });

  it("有一个词没有命中就不命中", () => {
    expect(matchFields("gmail nonexistent")).toBeUndefined();
  });

  it("没有词时不命中", () => {
    expect(matchFields("")).toBeUndefined();
    expect(matchFields("   ")).toBeUndefined();
  });
});

describe("matchEntryDocument 的拼音首字母", () => {
  it("名称里的汉字可以用拼音首字母命中", () => {
    expect(matchFields("yx")).toEqual(["name"]);
  });

  it("标签名里的汉字可以用拼音首字母命中", () => {
    expect(matchFields("gz")).toEqual(["tag"]);
  });

  it("备注里的汉字不做拼音首字母匹配", () => {
    const document: EntrySearchDocument = { ...DOCUMENT, notes: "邮箱" };

    expect(matchEntryDocument(document, parseSearchQuery("yx"))).toEqual([
      "name",
    ]);
    const withoutNameMatch: EntrySearchDocument = {
      ...document,
      name: "Other",
    };
    expect(
      matchEntryDocument(withoutNameMatch, parseSearchQuery("yx")),
    ).toBeUndefined();
  });
});

describe("matchEntryDocument 不参与搜索的内容", () => {
  it("文档里出现的非白名单键被忽略, 即使它的值含关键字", () => {
    const document: EntrySearchDocument = {
      ...DOCUMENT,
      fields: { ...DOCUMENT.fields, password: "hunter2", totp: "SECRET" },
    };

    expect(matchEntryDocument(document, parseSearchQuery("hunter2"))).toBe(
      undefined,
    );
    expect(matchEntryDocument(document, parseSearchQuery("secret"))).toBe(
      undefined,
    );
  });
});
