import { describe, expect, it } from "vitest";

import { MIGRATIONS_FOLDER } from "../testing/migrations-folder";
import { NEW_MASTER_PASSWORD } from "../testing/recovery-vault-fixtures";
import {
  startService,
  useVaultServiceHarness,
  type VaultServiceHarness,
} from "../testing/vault-service-harness";
import {
  FAST_ARGON2_PARAMETERS,
  TEST_MASTER_PASSWORD,
  createFakeSafeStorage,
} from "../testing/vault-test-fixtures";
import { generateDataKey } from "./data-key";
import { openVaultDatabase } from "./database/open-vault-database";
import { protectWithMasterPassword } from "./master-password-key-protector";
import { dataKeyToRecoveryWords } from "./recovery-phrase";
import { protectWithSystem } from "./system-key-protector";

/**
 * 按本工单之前的设置流程创建主密码保护的保险库: 生成数据密钥, 用主密码保护后写入密钥文件, 再
 * 创建数据库, 不经过恢复词. 用来证明旧保险库照常解锁, 密钥文件格式没有变化.
 * @param harness 测试环境.
 * @returns 数据密钥的副本, 用来编码出这个保险库的恢复词.
 */
async function createLegacyMasterPasswordVault(
  harness: VaultServiceHarness,
): Promise<Buffer> {
  const dataKey = generateDataKey();
  await harness.keyFileStore.write(
    await protectWithMasterPassword(
      dataKey,
      TEST_MASTER_PASSWORD,
      FAST_ARGON2_PARAMETERS,
    ),
  );
  openVaultDatabase({
    databaseFile: harness.paths.databaseFile,
    dataKey,
    migrationsFolder: MIGRATIONS_FOLDER,
  }).close();
  return dataKey;
}

/**
 * 按本工单之前的设置流程创建跳过主密码 (系统保护) 的保险库.
 * @param harness 测试环境.
 * @returns 数据密钥的副本.
 */
async function createLegacySystemProtectedVault(
  harness: VaultServiceHarness,
): Promise<Buffer> {
  const dataKey = generateDataKey();
  await harness.keyFileStore.write(
    await protectWithSystem(dataKey, createFakeSafeStorage()),
  );
  openVaultDatabase({
    databaseFile: harness.paths.databaseFile,
    dataKey,
    migrationsFolder: MIGRATIONS_FOLDER,
  }).close();
  return dataKey;
}

describe("VaultService 旧的主密码保险库", () => {
  const getHarness = useVaultServiceHarness();

  it("重启后是 locked, 主密码照常解锁", async () => {
    const harness = getHarness();
    await createLegacyMasterPasswordVault(harness);

    const service = await startService(harness);

    expect(service.getStatus()).toBe("locked");
    expect(await service.unlock(TEST_MASTER_PASSWORD)).toEqual({ ok: true });
    expect(service.getStatus()).toBe("unlocked");
  });

  it("忘记主密码时凭这个保险库的词恢复, 新主密码照常解锁", async () => {
    const harness = getHarness();
    const dataKey = await createLegacyMasterPasswordVault(harness);
    const words = dataKeyToRecoveryWords(dataKey);
    const service = await startService(harness);

    const result = await service.restoreWithMasterPassword(
      words,
      NEW_MASTER_PASSWORD,
    );
    service.close();
    const restarted = await startService(harness);

    expect(result).toEqual({ ok: true });
    expect(await restarted.unlock(NEW_MASTER_PASSWORD)).toEqual({ ok: true });
  });
});

describe("VaultService 旧的系统保护保险库", () => {
  const getHarness = useVaultServiceHarness();

  it("重启后直接是 unlocked", async () => {
    const harness = getHarness();
    await createLegacySystemProtectedVault(harness);

    const service = await startService(harness);

    expect(service.getStatus()).toBe("unlocked");
  });

  it("系统密钥失效后凭这个保险库的词重建, 照常解锁", async () => {
    const harness = getHarness();
    const dataKey = await createLegacySystemProtectedVault(harness);
    const failing = await startService(harness, {
      safeStorage: createFakeSafeStorage({ isDecryptionFailing: true }),
    });
    expect(failing.getStatus()).toBe("failed");

    const result = await failing.restoreWithMasterPassword(
      dataKeyToRecoveryWords(dataKey),
      NEW_MASTER_PASSWORD,
    );
    failing.close();
    const restarted = await startService(harness);

    expect(result).toEqual({ ok: true });
    expect(await restarted.unlock(NEW_MASTER_PASSWORD)).toEqual({ ok: true });
  });
});
