import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";

import { SEARCHABLE_FIELD_KEYS } from "@shared/search/search-fields";

import {
  SECRET_CANARIES,
  searchRecordOf,
} from "../testing/search-record-fixture";
import { useVaultDatabase } from "../testing/use-vault-database";
import { insertEntry } from "./entry-repository";
import {
  ENTRY_SEARCH_QUERY,
  listEntrySearchRows,
} from "./entry-search-repository";

describe("搜索查询的文本", () => {
  const rendered = new SQLiteSyncDialect().sqlToQuery(ENTRY_SEARCH_QUERY);

  it("类型字段的键白名单作为绑定参数, 与参与搜索的字段键一致", () => {
    expect(rendered.params).toEqual(SEARCHABLE_FIELD_KEYS);
  });

  it("绑定参数里没有任何保密字段键", () => {
    for (const key of [
      "password",
      "privateKey",
      "apiKey",
      "recoveryPhrase",
      "cardNumber",
      "securityCode",
    ]) {
      expect(rendered.params).not.toContain(key);
    }
  });

  it("不查 TOTP, 文件夹与创建时间列, 自定义字段只取字段名", () => {
    expect(rendered.sql).not.toMatch(/totp|folder_id|created_at/);
    expect(rendered.sql).toContain("'$.label'");
    expect(rendered.sql).not.toContain("$.value");
    expect(rendered.sql).not.toContain("$.isHidden");
  });
});

describe("listEntrySearchRows", () => {
  const getDatabase = useVaultDatabase("entry-search-repository");

  it("读出名称, 类型, 备注, 白名单里的类型字段与自定义字段名", () => {
    const { orm } = getDatabase();
    insertEntry(orm, searchRecordOf("a"));

    const rows = listEntrySearchRows(orm);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "a",
      name: "name-a",
      type: "login",
      notes: "notes-a",
    });
    expect(JSON.parse(rows[0].searchableFields)).toEqual({
      account: "account-a",
      url: "https://a.example.test",
    });
    expect(JSON.parse(rows[0].customFieldLabels)).toEqual([
      "label-a",
      "hidden-label-a",
    ]);
  });

  it("读出的行里没有密码, TOTP 密钥, 自定义字段的值", () => {
    const { orm } = getDatabase();
    insertEntry(orm, searchRecordOf("a"));

    const serialized = JSON.stringify(listEntrySearchRows(orm)).toLowerCase();

    for (const secret of Object.values(SECRET_CANARIES)) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("没有类型字段与自定义字段时分别读出空对象与空数组", () => {
    const { orm } = getDatabase();
    insertEntry(orm, searchRecordOf("a", { fields: {}, customFields: [] }));

    const [row] = listEntrySearchRows(orm);

    expect(row.searchableFields).toBe("{}");
    expect(row.customFieldLabels).toBe("[]");
  });

  it("每个条目一行, 没有条目时为空", () => {
    const { orm } = getDatabase();
    expect(listEntrySearchRows(orm)).toEqual([]);

    insertEntry(orm, searchRecordOf("a"));
    insertEntry(orm, searchRecordOf("b"));

    expect(
      listEntrySearchRows(orm)
        .map((row) => row.id)
        .sort(),
    ).toEqual(["a", "b"]);
  });
});
