import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import type { EntrySearchHit } from "@shared/search/entry-search-types";

import {
  SECRET_CANARIES,
  insertFolderNamed,
  insertTagNamed,
  searchRecordOf,
} from "../testing/search-record-fixture";
import { useVaultDatabase } from "../testing/use-vault-database";
import { replaceEntryTags } from "../tags/entry-tag-repository";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { insertEntry } from "./entry-repository";
import { searchEntries } from "./entry-search";

/**
 * 测试库里放的条目: 每个条目只在一类字段里有独有的词.
 */
const FIXTURE_ENTRIES = [
  searchRecordOf("plain"),
  searchRecordOf("forum", {
    type: "forum",
    name: "Forum Zebra",
    fields: {
      account: "forum-user",
      password: SECRET_CANARIES.password,
      email: "contact@quartz.example",
      url: "https://forum.example/giraffe",
    },
    notes: "remember the walrus",
  }),
  searchRecordOf("card", {
    type: "bankCard",
    name: "工资卡",
    fields: {
      cardholder: "Zhang Wei",
      bankName: "Harbor Bank",
      cardNumber: "6222000011112222",
      expiry: "12/30",
      securityCode: "987",
      cardPin: "4321",
    },
    notes: "",
    customFields: [
      { id: "c-1", label: "Branch Office", value: "x", isHidden: false },
    ],
    totp: null,
  }),
] as const;

/**
 * 在测试库里写入全部测试条目, 一个文件夹与两个标签, 并给 plain 条目带上两个标签.
 * @param orm 已解锁数据库的查询入口.
 */
function seed(orm: VaultOrm): void {
  insertFolderNamed(orm, "folder-1", SECRET_CANARIES.folderName);
  insertTagNamed(orm, "tag-1", "工作");
  insertTagNamed(orm, "tag-2", "Personal");
  for (const record of FIXTURE_ENTRIES) {
    insertEntry(orm, record);
  }
  replaceEntryTags(orm, "plain", ["tag-1", "tag-2"]);
}

/**
 * 取命中条目的编号.
 * @param hits 命中列表.
 * @returns 命中的条目编号, 按先后排序.
 */
function idsOf(hits: readonly EntrySearchHit[]): string[] {
  return hits.map((hit) => hit.id).sort();
}

describe("searchEntries 的字段命中", () => {
  const getDatabase = useVaultDatabase("entry-search");

  it.each([
    ["zebra", ["forum"], "name"],
    ["forum-user", ["forum"], "account"],
    ["giraffe", ["forum"], "url"],
    ["quartz", ["forum"], "email"],
    ["walrus", ["forum"], "notes"],
    ["zhang wei", ["card"], "cardholder"],
    ["harbor", ["card"], "bankName"],
    ["branch office", ["card"], "customFieldLabel"],
    ["hidden-label-plain", ["plain"], "customFieldLabel"],
    ["personal", ["plain"], "tag"],
    ["工作", ["plain"], "tag"],
  ])("关键字 %s 命中 %j 的 %s", (query, ids, field) => {
    const { orm } = getDatabase();
    seed(orm);

    const hits = searchEntries(orm, query);

    expect(idsOf(hits)).toEqual(ids);
    expect(hits[0].fields).toContain(field);
  });

  it("命中结果里只有条目编号与命中字段名", () => {
    const { orm } = getDatabase();
    seed(orm);

    expect(searchEntries(orm, "giraffe")).toEqual([
      { id: "forum", fields: ["url"] },
    ]);
  });
});

describe("searchEntries 不参与搜索的内容", () => {
  const getDatabase = useVaultDatabase("entry-search-secret");

  it.each([
    ["密码", SECRET_CANARIES.password],
    ["自定义字段的值", SECRET_CANARIES.visibleCustomValue],
    ["隐藏的自定义字段的值", SECRET_CANARIES.hiddenCustomValue],
    ["TOTP 密钥", SECRET_CANARIES.totpSecret],
    ["文件夹名", SECRET_CANARIES.folderName],
    ["银行卡号", "6222000011112222"],
    ["银行卡安全码", "987"],
    ["类型键", "bankcard"],
    ["银行卡密码", "4321"],
  ])("%s 里的词搜不到", (_label, query) => {
    const { orm } = getDatabase();
    seed(orm);

    expect(searchEntries(orm, query)).toEqual([]);
  });

  it("条目放进文件夹后文件夹名仍然搜不到", () => {
    const { orm } = getDatabase();
    seed(orm);
    insertEntry(
      orm,
      searchRecordOf("filed", { folderId: "folder-1", name: "filed" }),
    );

    expect(searchEntries(orm, "canary-folder")).toEqual([]);
  });
});

describe("searchEntries 的匹配方式", () => {
  const getDatabase = useVaultDatabase("entry-search-matching");

  it("多个词要同时满足, 可以命中不同字段", () => {
    const { orm } = getDatabase();
    seed(orm);

    expect(idsOf(searchEntries(orm, "zebra walrus"))).toEqual(["forum"]);
    expect(searchEntries(orm, "zebra branch")).toEqual([]);
  });

  it("忽略大小写与重音", () => {
    const { orm } = getDatabase();
    seed(orm);
    insertEntry(orm, searchRecordOf("accent", { name: "Éclair Crème" }));

    expect(idsOf(searchEntries(orm, "ECLAIR creme"))).toEqual(["accent"]);
  });

  it("名称与标签名支持拼音首字母", () => {
    const { orm } = getDatabase();
    seed(orm);

    expect(idsOf(searchEntries(orm, "gzk"))).toEqual(["card"]);
    expect(idsOf(searchEntries(orm, "gz"))).toEqual(["card", "plain"]);
  });

  it("关键字里没有有效的词时没有命中", () => {
    const { orm } = getDatabase();
    seed(orm);

    expect(searchEntries(orm, "")).toEqual([]);
    expect(searchEntries(orm, "   ")).toEqual([]);
  });

  it("类型不是预设类型的条目不会读出类型字段, 但名称与备注仍参与", () => {
    const { orm } = getDatabase();
    insertEntry(
      orm,
      searchRecordOf("odd", {
        type: "login",
        name: "odd-name",
        fields: { account: "odd-account" },
      }),
    );
    orm.run(sql`update entries set type = 'removed-type' where id = 'odd'`);

    expect(idsOf(searchEntries(orm, "odd-name"))).toEqual(["odd"]);
    expect(searchEntries(orm, "odd-account")).toEqual([]);
  });
});
