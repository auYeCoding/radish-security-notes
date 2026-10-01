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
    account: `account-${id}`,
    password: `password-${id}`,
    createdAt,
  };
}

describe("条目仓库", () => {
  const getDirectory = useTemporaryDirectory("entry-repository");
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

  it("插入的条目能按编号读回, 含密码", () => {
    insertEntry(database.orm, recordOf("a", 1));

    expect(findEntry(database.orm, "a")).toEqual(recordOf("a", 1));
  });

  it("没有这个编号时读不到", () => {
    expect(findEntry(database.orm, "missing")).toBeUndefined();
  });

  it("摘要只含编号, 名称与账号, 最新创建的在最前", () => {
    insertEntry(database.orm, recordOf("old", 1));
    insertEntry(database.orm, recordOf("new", 3));
    insertEntry(database.orm, recordOf("middle", 2));

    expect(listEntrySummaries(database.orm)).toEqual([
      { id: "new", name: "name-new", account: "account-new" },
      { id: "middle", name: "name-middle", account: "account-middle" },
      { id: "old", name: "name-old", account: "account-old" },
    ]);
  });

  it("创建时间相同时后插入的在前", () => {
    insertEntry(database.orm, recordOf("first", 5));
    insertEntry(database.orm, recordOf("second", 5));

    const identifiers = listEntrySummaries(database.orm).map(
      (summary) => summary.id,
    );

    expect(identifiers).toEqual(["second", "first"]);
  });

  it("没有条目时列表为空", () => {
    expect(listEntrySummaries(database.orm)).toEqual([]);
  });
});
