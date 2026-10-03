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
  deleteEntry,
  findEntry,
  insertEntry,
  listEntrySummaries,
  updateEntry,
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
    totp: null,
    folderId: null,
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

  it("TOTP 配置原样读回, 不带 TOTP 的条目读回 null", () => {
    const totp = {
      secret: "JBSWY3DPEHPK3PXP",
      algorithm: "SHA512",
      digits: 8,
      periodSeconds: 60,
    } as const;
    insertEntry(getDatabase().orm, { ...recordOf("with", 1), totp });
    insertEntry(getDatabase().orm, recordOf("without", 2));

    expect(findEntry(getDatabase().orm, "with")?.totp).toEqual(totp);
    expect(findEntry(getDatabase().orm, "without")?.totp).toBeNull();
  });
});

/**
 * 更新测试里用的 TOTP 配置, 默认算法, 位数与周期.
 */
const SAMPLE_TOTP = {
  secret: "JBSWY3DPEHPK3PXP",
  algorithm: "SHA1",
  digits: 6,
  periodSeconds: 30,
} as const;

describe("条目仓库: 更新", () => {
  const getDatabase = useRepositoryDatabase("entry-repository-update");

  it("更新只改名称, 类型字段, 备注, 自定义字段与 TOTP, 编号, 类型与创建时间不变", () => {
    const { orm } = getDatabase();
    insertEntry(orm, recordOf("a", 7));
    const totp = SAMPLE_TOTP;

    const isUpdated = updateEntry(orm, {
      ...recordOf("a", 999),
      type: "bankCard",
      name: "new-name",
      fields: { account: "new-account" },
      notes: "new-notes",
      customFields: [{ id: "f", label: "l", value: "v", isHidden: false }],
      totp,
    });

    expect(isUpdated).toBe(true);
    expect(findEntry(orm, "a")).toEqual({
      id: "a",
      name: "new-name",
      type: "login",
      fields: { account: "new-account" },
      notes: "new-notes",
      customFields: [{ id: "f", label: "l", value: "v", isHidden: false }],
      totp,
      folderId: null,
      createdAt: 7,
    });
  });

  it("更新可以把 TOTP 清成 null", () => {
    const { orm } = getDatabase();
    insertEntry(orm, { ...recordOf("a", 1), totp: SAMPLE_TOTP });

    updateEntry(orm, recordOf("a", 1));

    expect(findEntry(orm, "a")?.totp).toBeNull();
  });

  it("更新不存在的编号返回 false 且不新增行", () => {
    const { orm } = getDatabase();

    expect(updateEntry(orm, recordOf("missing", 1))).toBe(false);
    expect(listEntrySummaries(orm)).toEqual([]);
  });
});

describe("条目仓库: 删除", () => {
  const getDatabase = useRepositoryDatabase("entry-repository-delete");

  it("删除后读不到该条目, 其它条目不受影响", () => {
    const { orm } = getDatabase();
    insertEntry(orm, recordOf("a", 1));
    insertEntry(orm, recordOf("b", 2));

    const isDeleted = deleteEntry(orm, "a");

    expect(isDeleted).toBe(true);
    expect(findEntry(orm, "a")).toBeUndefined();
    expect(findEntry(orm, "b")).toEqual(recordOf("b", 2));
  });

  it("删除不存在的编号或重复删除返回 false", () => {
    const { orm } = getDatabase();
    insertEntry(orm, recordOf("a", 1));

    expect(deleteEntry(orm, "missing")).toBe(false);
    expect(deleteEntry(orm, "a")).toBe(true);
    expect(deleteEntry(orm, "a")).toBe(false);
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
