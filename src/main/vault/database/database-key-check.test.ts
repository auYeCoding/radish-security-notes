import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { useTemporaryDirectory } from "../../testing/temporary-directory";
import { fileExists } from "../file-exists";
import { doesDatabaseAcceptKey } from "./database-key-check";
import { openEncryptedDatabase } from "./open-encrypted-database";

describe("doesDatabaseAcceptKey", () => {
  const getDirectory = useTemporaryDirectory("database-key-check");

  const createDatabase = (databaseFile: string, dataKey: Buffer): void => {
    const client = openEncryptedDatabase(databaseFile, dataKey);
    client.exec("create table sample (value integer)");
    client.close();
  };

  it("数据库接受正确的数据密钥", async () => {
    const databaseFile = join(getDirectory(), "vault.db");
    const dataKey = randomBytes(32);
    createDatabase(databaseFile, dataKey);

    expect(await doesDatabaseAcceptKey(databaseFile, dataKey)).toBe(true);
  });

  it("数据库拒绝另一个数据密钥", async () => {
    const databaseFile = join(getDirectory(), "vault.db");
    createDatabase(databaseFile, randomBytes(32));

    expect(await doesDatabaseAcceptKey(databaseFile, randomBytes(32))).toBe(
      false,
    );
  });

  it("文件不存在时不接受任何密钥, 也不创建文件", async () => {
    const databaseFile = join(getDirectory(), "vault.db");

    expect(await doesDatabaseAcceptKey(databaseFile, randomBytes(32))).toBe(
      false,
    );
    expect(await fileExists(databaseFile)).toBe(false);
  });

  it("空文件不接受任何密钥", async () => {
    const databaseFile = join(getDirectory(), "vault.db");
    await writeFile(databaseFile, "");

    expect(await doesDatabaseAcceptKey(databaseFile, randomBytes(32))).toBe(
      false,
    );
  });

  it("检查不改动数据库文件", async () => {
    const databaseFile = join(getDirectory(), "vault.db");
    const dataKey = randomBytes(32);
    createDatabase(databaseFile, dataKey);
    const before = await readFile(databaseFile);

    await doesDatabaseAcceptKey(databaseFile, dataKey);

    expect((await readFile(databaseFile)).equals(before)).toBe(true);
  });
});
