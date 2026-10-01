import { randomBytes } from "node:crypto";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useTemporaryDirectory } from "../testing/temporary-directory";
import { MIGRATIONS_FOLDER } from "../testing/migrations-folder";
import {
  openVaultDatabase,
  type VaultDatabase,
} from "../vault/database/open-vault-database";
import {
  findEntry,
  insertEntry,
  listEntrySummaries,
  type EntryRecord,
} from "./entry-repository";

/**
 * 构造一个测试用的条目行.
 * @param id 条目编号.
 * @param createdAt 创建时间的毫秒时间戳.
 * @returns 条目行.
 */
function recordOf(id: string, createdAt: number): EntryRecord {
  return {
    id,
    name: `name-${id}`,
    type: "login",
    fields: {
      account: `account-${id}`,
      password: `password-${id}`,
      url: `https://example.test/${id}`,
    },
    notes: `notes-${id}\nline-2`,
    customFields: [
      { id: `field-${id}`, label: `label-${id}`, value: "v", isHidden: true },
    ],
    createdAt,
  };
}

/**
 * 在每个测试前打开一个新的临时数据库, 测试后关闭.
 * @param directoryName 临时目录的名称前缀.
 * @returns 取当前测试数据库的函数.
 */
function useRepositoryDatabase(directoryName: string): () => VaultDatabase {
  const getDirectory = useTemporaryDirectory(directoryName);
  let database: VaultDatabase;
  beforeEach(() => {
    database = openVaultDatabase({
      databaseFile: join(getDirectory(), "vault.db"),
      dataKey: randomBytes(32),
      migrationsFolder: MIGRATIONS_FOLDER,
    });
  });
  afterEach(() => {
    database.close();
  });
  return () => database;
}

describe("条目仓库: 读写", () => {
  const getDatabase = useRepositoryDatabase("entry-repository");

  it("插入的条目能按编号读回, 含全部类型字段", () => {
    insertEntry(getDatabase().orm, recordOf("a", 1));

    expect(findEntry(getDatabase().orm, "a")).toEqual(recordOf("a", 1));
  });

  it("没有这个编号时读不到", () => {
    expect(findEntry(getDatabase().orm, "missing")).toBeUndefined();
  });
});

describe("条目仓库: 摘要列表", () => {
  const getDatabase = useRepositoryDatabase("entry-repository-list");

  it("摘要只含编号, 名称, 类型与账号, 最新创建的在最前", () => {
    const { orm } = getDatabase();
    insertEntry(orm, recordOf("old", 1));
    insertEntry(orm, recordOf("new", 3));
    insertEntry(orm, recordOf("middle", 2));

    expect(listEntrySummaries(orm)).toEqual([
      { id: "new", name: "name-new", type: "login", account: "account-new" },
      {
        id: "middle",
        name: "name-middle",
        type: "login",
        account: "account-middle",
      },
      { id: "old", name: "name-old", type: "login", account: "account-old" },
    ]);
  });

  it("类型没有账号字段或没有填写时摘要里的账号为空串", () => {
    const { orm } = getDatabase();
    insertEntry(orm, {
      ...recordOf("card", 2),
      type: "bankCard",
      fields: { cardNumber: "6222" },
    });
    insertEntry(orm, {
      ...recordOf("blank", 1),
      fields: { account: "", password: "p", url: "" },
    });

    expect(listEntrySummaries(orm)).toEqual([
      { id: "card", name: "name-card", type: "bankCard", account: "" },
      { id: "blank", name: "name-blank", type: "login", account: "" },
    ]);
  });

  it("创建时间相同时后插入的在前", () => {
    const { orm } = getDatabase();
    insertEntry(orm, recordOf("first", 5));
    insertEntry(orm, recordOf("second", 5));

    const identifiers = listEntrySummaries(orm).map((summary) => summary.id);

    expect(identifiers).toEqual(["second", "first"]);
  });

  it("没有条目时列表为空", () => {
    expect(listEntrySummaries(getDatabase().orm)).toEqual([]);
  });
});
