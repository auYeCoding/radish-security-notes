import { describe, expect, it } from "vitest";

import { useVaultDatabase } from "../testing/use-vault-database";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { buildCustomEntryTypeRows } from "./custom-entry-type-record-builder";
import { insertCustomEntryType } from "./custom-entry-type-repository";
import { loadEntryTypeCatalog } from "./entry-type-catalog";

/**
 * 写入一个自定义类型 "路由器": 地址 (摘要), 口令 (保密), 说明 (多行), 类型编号是 t1, 口令与说明的
 * 字段键是 field-f2 与 field-f3.
 * @param orm 已解锁数据库的查询入口.
 */
function insertRouterType(orm: VaultOrm): void {
  const identifiers = ["t1", "f2", "f3"];
  insertCustomEntryType(
    orm,
    buildCustomEntryTypeRows({
      values: {
        name: "路由器",
        fields: [
          {
            name: "地址",
            kind: "singleLine",
            isSensitive: false,
            isSummary: true,
          },
          {
            name: "口令",
            kind: "singleLine",
            isSensitive: true,
            isSummary: false,
          },
          {
            name: "说明",
            kind: "multiLine",
            isSensitive: false,
            isSummary: false,
          },
        ],
      },
      createIdentifier: () => identifiers.shift() ?? "unused",
      createdAt: 1,
    }),
  );
}

describe("条目类型目录: 没有自定义类型", () => {
  const getDatabase = useVaultDatabase("entry-type-catalog-empty");

  it("只认预设类型, 没有自定义可搜键", () => {
    const catalog = loadEntryTypeCatalog(getDatabase().orm);

    expect(catalog.find("login")?.key).toBe("login");
    expect(catalog.find("custom:t1")).toBeUndefined();
    expect(catalog.customSearchableFieldKeys).toEqual([]);
  });
});

describe("条目类型目录: 有自定义类型", () => {
  const getDatabase = useVaultDatabase("entry-type-catalog");

  it("认得自定义类型, 带类型名与字段名, 可搜键取自库里生成的非保密字段键, 预设类型不受影响", () => {
    insertRouterType(getDatabase().orm);
    const catalog = loadEntryTypeCatalog(getDatabase().orm);

    const custom = catalog.find("custom:t1");

    expect(custom?.name).toBe("路由器");
    expect(custom?.fields.map((field) => field.name)).toEqual([
      "地址",
      "口令",
      "说明",
    ]);
    expect(catalog.customSearchableFieldKeys).toEqual(["account", "field-f3"]);
    expect(catalog.find("login")?.name).toBeUndefined();
  });
});
