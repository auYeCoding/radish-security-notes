import { randomBytes } from "node:crypto";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MIGRATIONS_FOLDER } from "../testing/migrations-folder";
import {
  prepareMasterPasswordVault,
  prepareSystemProtectedVault,
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import {
  TEST_MASTER_PASSWORD,
  createFakeSafeStorage,
} from "../testing/vault-test-fixtures";
import { openVaultDatabase } from "./database/open-vault-database";
import { unprotectWithMasterPassword } from "./master-password-key-protector";

describe("VaultService 文件不一致时转入 failed", () => {
  const getHarness = useVaultServiceHarness();

  it("有数据库文件却没有密钥文件时是 failed, 不覆盖已有文件", async () => {
    const harness = getHarness();
    await prepareMasterPasswordVault(harness);
    const databaseBefore = await readFile(harness.paths.databaseFile);
    await rm(harness.paths.keyFile);

    const service = await startService(harness);
    const result = await service.setupWithMasterPassword(TEST_MASTER_PASSWORD);

    expect(service.getStatus()).toBe("failed");
    expect(result).toEqual({ ok: false, reason: "unexpected-state" });
    expect(await readFile(harness.paths.databaseFile)).toEqual(databaseBefore);
  });

  it("密钥文件损坏时是 failed 并通知失败回调", async () => {
    const harness = getHarness();
    await prepareSystemProtectedVault(harness);
    await writeFile(harness.paths.keyFile, "{broken", "utf8");

    const service = await startService(harness);

    expect(service.getStatus()).toBe("failed");
    expect(harness.failures).toHaveLength(1);
  });

  it("数据库换成别的密钥加密的文件时解锁失败并转入 failed", async () => {
    const harness = getHarness();
    await prepareMasterPasswordVault(harness);
    await rm(harness.paths.databaseFile);
    openVaultDatabase({
      databaseFile: harness.paths.databaseFile,
      dataKey: randomBytes(32),
      migrationsFolder: MIGRATIONS_FOLDER,
    }).close();

    const service = await startService(harness);
    const result = await service.unlock(TEST_MASTER_PASSWORD);

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(service.getStatus()).toBe("failed");
  });
});

describe("VaultService 系统保护的异常", () => {
  const getHarness = useVaultServiceHarness();

  it("系统保护的数据密钥解不开时是 failed", async () => {
    const harness = getHarness();
    await prepareSystemProtectedVault(harness);

    const service = await startService(harness, {
      safeStorage: createFakeSafeStorage({ isDecryptionFailing: true }),
    });

    expect(service.getStatus()).toBe("failed");
    expect(harness.failures).toHaveLength(1);
  });

  it("系统要求重新加密时改写密钥文件, 之后仍能解锁", async () => {
    const harness = getHarness();
    await prepareSystemProtectedVault(harness);
    const recordBefore = await harness.keyFileStore.read();
    const safeStorage = createFakeSafeStorage({ shouldReEncrypt: true });

    const refreshing = await startService(harness, { safeStorage });
    refreshing.close();

    expect(refreshing.getStatus()).toBe("unlocked");
    expect(safeStorage.getEncryptionCount()).toBe(1);
    expect(await harness.keyFileStore.read()).not.toEqual(recordBefore);
    expect((await startService(harness)).getStatus()).toBe("unlocked");
  });
});

describe("VaultService 磁盘上没有明文", () => {
  const getHarness = useVaultServiceHarness();

  it("设置主密码后保险库目录里没有主密码与数据密钥的明文", async () => {
    const harness = getHarness();
    await prepareMasterPasswordVault(harness);
    const record = await harness.keyFileStore.read();
    if (record?.protection !== "master-password") {
      throw new Error("测试前提不成立: 密钥文件应为主密码保护方式");
    }
    const dataKey = await unprotectWithMasterPassword(
      record,
      TEST_MASTER_PASSWORD,
    );

    const files = await readdir(harness.paths.directory);
    const contents = await Promise.all(
      files.map((file) => readFile(join(harness.paths.directory, file))),
    );

    expect(files.sort()).toEqual(["vault-key.json", "vault.db"]);
    for (const content of contents) {
      expect(content.includes(TEST_MASTER_PASSWORD)).toBe(false);
      expect(content.includes(dataKey)).toBe(false);
      expect(content.includes(dataKey.toString("hex"))).toBe(false);
      expect(content.includes(dataKey.toString("base64"))).toBe(false);
    }
  });
});
