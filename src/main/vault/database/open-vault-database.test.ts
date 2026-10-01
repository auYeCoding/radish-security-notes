import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { useTemporaryDirectory } from "../../testing/temporary-directory";
import { MIGRATIONS_FOLDER } from "../../testing/migrations-folder";
import { DatabaseKeyRejectedError } from "./open-encrypted-database";
import { openVaultDatabase, type VaultDatabase } from "./open-vault-database";
import { vaultMetadata } from "./vault-schema";

/**
 * 明文 SQLite 文件开头的 16 字节标识.
 */
const PLAIN_SQLITE_HEADER = "SQLite format 3\0";

/**
 * 写入库中用来检查不会明文落盘的标记文本.
 */
const SECRET_MARKER = "marker-that-must-not-appear-in-plaintext";

/**
 * 用项目的迁移文件夹打开保险库数据库.
 * @param databaseFile 数据库文件路径.
 * @param dataKey 数据密钥, 默认随机生成.
 * @returns 已解锁并迁移完成的数据库.
 */
function openDatabase(
  databaseFile: string,
  dataKey: Buffer = randomBytes(32),
): VaultDatabase {
  return openVaultDatabase({
    databaseFile,
    dataKey,
    migrationsFolder: MIGRATIONS_FOLDER,
  });
}

describe("openVaultDatabase 新建", () => {
  const getDirectory = useTemporaryDirectory("vault-database");

  it("数据库文件头不是明文 SQLite 标识", async () => {
    const databaseFile = join(getDirectory(), "vault.db");
    openDatabase(databaseFile).close();

    const header = (await readFile(databaseFile)).subarray(0, 16);

    expect(header.toString("latin1")).not.toBe(PLAIN_SQLITE_HEADER);
  });

  it("打开时执行迁移并建好元数据表", () => {
    const database = openDatabase(join(getDirectory(), "vault.db"));

    const tables = database.orm.all(
      sql`select name from sqlite_master where name = 'vault_metadata'`,
    );
    database.close();

    expect(tables).toHaveLength(1);
  });

  it("写入的内容与数据密钥都不以明文出现在文件里", async () => {
    const databaseFile = join(getDirectory(), "vault.db");
    const dataKey = randomBytes(32);
    const database = openDatabase(databaseFile, dataKey);
    database.orm
      .insert(vaultMetadata)
      .values({ key: SECRET_MARKER, value: SECRET_MARKER })
      .run();
    database.close();

    const content = await readFile(databaseFile);

    expect(content.includes(SECRET_MARKER)).toBe(false);
    expect(content.includes(dataKey)).toBe(false);
    expect(content.includes(dataKey.toString("hex"))).toBe(false);
  });
});

describe("openVaultDatabase 重新打开", () => {
  const getDirectory = useTemporaryDirectory("vault-database");

  it("同一个数据密钥重新打开能读回数据, 迁移不重复执行", () => {
    const databaseFile = join(getDirectory(), "vault.db");
    const dataKey = randomBytes(32);
    const first = openDatabase(databaseFile, dataKey);
    first.orm
      .insert(vaultMetadata)
      .values({ key: "example", value: "stored" })
      .run();
    first.close();

    const second = openDatabase(databaseFile, dataKey);
    const rows = second.orm.select().from(vaultMetadata).all();
    second.close();

    expect(rows).toEqual([{ key: "example", value: "stored" }]);
  });

  it("错误的数据密钥被拒绝", () => {
    const databaseFile = join(getDirectory(), "vault.db");
    openDatabase(databaseFile).close();

    expect(() => openDatabase(databaseFile)).toThrow(DatabaseKeyRejectedError);
  });
});
