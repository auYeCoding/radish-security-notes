import { randomBytes } from "node:crypto";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { MIGRATIONS_FOLDER } from "../testing/migrations-folder";
import {
  prepareMasterPasswordVault,
  prepareSystemProtectedVault,
  startService,
  useVaultServiceHarness,
  type VaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";
import { openVaultDatabase } from "./database/open-vault-database";
import { fileExists } from "./file-exists";

/**
 * 保险库目录里全部文件的内容, 以文件名为键, 用来断言失败路径没有创建, 改动或删除任何文件.
 * @param harness 测试环境.
 * @returns 文件名到内容的映射.
 */
async function snapshotVaultDirectory(
  harness: VaultServiceHarness,
): Promise<Record<string, string>> {
  const names = (await readdir(harness.paths.directory)).sort();
  const contents = await Promise.all(
    names.map(async (name) =>
      (await readFile(`${harness.paths.directory}/${name}`)).toString("hex"),
    ),
  );
  return Object.fromEntries(
    names.map((name, index) => [name, contents[index]]),
  );
}

describe("VaultService 有密钥文件而数据库文件缺失", () => {
  const getHarness = useVaultServiceHarness();

  it("系统保护的保险库启动时进入 failed, 不新建数据库文件, 不报已解锁", async () => {
    const harness = getHarness();
    await prepareSystemProtectedVault(harness);
    await rm(harness.paths.databaseFile);
    const before = await snapshotVaultDirectory(harness);

    const service = await startService(harness);

    expect(service.getStatus()).toBe("failed");
    expect(service.getOrm()).toBeUndefined();
    expect(service.getFailure()).toEqual({
      cause: "database-missing",
      stage: "startup",
      errorName: undefined,
    });
    expect(await snapshotVaultDirectory(harness)).toEqual(before);
    expect(harness.failures).toHaveLength(0);
  });

  it("主密码保护的保险库启动时进入 failed 而不是 locked, 解锁被拒绝", async () => {
    const harness = getHarness();
    await prepareMasterPasswordVault(harness);
    await rm(harness.paths.databaseFile);
    const before = await snapshotVaultDirectory(harness);

    const service = await startService(harness);
    const result = await service.unlock(TEST_MASTER_PASSWORD);

    expect(service.getStatus()).toBe("failed");
    expect(result).toEqual({ ok: false, reason: "unexpected-state" });
    expect(await snapshotVaultDirectory(harness)).toEqual(before);
  });

  it("数据库文件是空文件时按缺失处理, 文件保持为空", async () => {
    const harness = getHarness();
    await prepareSystemProtectedVault(harness);
    await writeFile(harness.paths.databaseFile, "");

    const service = await startService(harness);

    expect(service.getFailure()?.cause).toBe("database-missing");
    expect((await readFile(harness.paths.databaseFile)).length).toBe(0);
  });
});

describe("VaultService 锁定期间数据库文件被删", () => {
  const getHarness = useVaultServiceHarness();

  it("解锁前再检查一次: 进入 failed, 不新建数据库文件, 不动密钥文件", async () => {
    const harness = getHarness();
    await prepareMasterPasswordVault(harness);
    const service = await startService(harness);
    expect(service.getStatus()).toBe("locked");
    await rm(harness.paths.databaseFile);
    const before = await snapshotVaultDirectory(harness);

    const result = await service.unlock(TEST_MASTER_PASSWORD);

    expect(result).toEqual({ ok: false, reason: "unexpected-state" });
    expect(service.getStatus()).toBe("failed");
    expect(service.getFailure()).toEqual({
      cause: "database-missing",
      stage: "unlock",
      errorName: undefined,
    });
    expect(await fileExists(harness.paths.databaseFile)).toBe(false);
    expect(await snapshotVaultDirectory(harness)).toEqual(before);
  });
});

describe("VaultService 另外两种文件不一致", () => {
  const getHarness = useVaultServiceHarness();

  it("有数据库文件却没有密钥文件: 原因是 key-file-missing, 数据库文件不变", async () => {
    const harness = getHarness();
    await prepareMasterPasswordVault(harness);
    await rm(harness.paths.keyFile);
    const before = await snapshotVaultDirectory(harness);

    const service = await startService(harness);

    expect(service.getStatus()).toBe("failed");
    expect(service.getFailure()).toEqual({
      cause: "key-file-missing",
      stage: "startup",
      errorName: undefined,
    });
    expect(await snapshotVaultDirectory(harness)).toEqual(before);
  });

  it("两个文件都在但数据库打不开 (解锁): 原因是 database-unreadable, 两个文件不变", async () => {
    const harness = getHarness();
    await prepareMasterPasswordVault(harness);
    await rm(harness.paths.databaseFile);
    openVaultDatabase({
      databaseFile: harness.paths.databaseFile,
      dataKey: randomBytes(32),
      migrationsFolder: MIGRATIONS_FOLDER,
    }).close();
    const before = await snapshotVaultDirectory(harness);

    const service = await startService(harness);
    await service.unlock(TEST_MASTER_PASSWORD);

    expect(service.getStatus()).toBe("failed");
    expect(service.getFailure()).toEqual({
      cause: "database-unreadable",
      stage: "unlock",
      errorName: "DatabaseKeyRejectedError",
    });
    expect(await snapshotVaultDirectory(harness)).toEqual(before);
  });

  it("两个文件都在但数据库打不开 (启动): 原因是 database-unreadable, 通知失败回调", async () => {
    const harness = getHarness();
    await prepareSystemProtectedVault(harness);
    await writeFile(harness.paths.databaseFile, randomBytes(4096));
    const before = await snapshotVaultDirectory(harness);

    const service = await startService(harness);

    expect(service.getStatus()).toBe("failed");
    expect(service.getFailure()?.cause).toBe("database-unreadable");
    expect(service.getFailure()?.stage).toBe("startup");
    expect(harness.failures).toHaveLength(1);
    expect(await snapshotVaultDirectory(harness)).toEqual(before);
  });
});
