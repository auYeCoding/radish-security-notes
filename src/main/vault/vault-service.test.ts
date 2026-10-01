import { describe, expect, it } from "vitest";

import {
  prepareMasterPasswordVault,
  prepareSystemProtectedVault,
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";
import { fileExists } from "./file-exists";

describe("VaultService 设置主密码", () => {
  const getHarness = useVaultServiceHarness();

  it("全新状态下启动状态是 needs-setup", async () => {
    const service = await startService(getHarness());

    expect(service.getStatus()).toBe("needs-setup");
  });

  it("设置后进入已解锁状态, 并创建密钥文件与数据库文件", async () => {
    const harness = getHarness();
    const service = await startService(harness);

    const result = await service.setupWithMasterPassword(TEST_MASTER_PASSWORD);

    expect(result).toEqual({ ok: true });
    expect(service.getStatus()).toBe("unlocked");
    expect(await fileExists(harness.paths.keyFile)).toBe(true);
    expect(await fileExists(harness.paths.databaseFile)).toBe(true);
    expect((await harness.keyFileStore.read())?.protection).toBe(
      "master-password",
    );
  });

  it("主密码太短时拒绝, 不创建任何文件", async () => {
    const harness = getHarness();
    const service = await startService(harness);

    const result = await service.setupWithMasterPassword("short");

    expect(result).toEqual({ ok: false, reason: "password-too-short" });
    expect(service.getStatus()).toBe("needs-setup");
    expect(await fileExists(harness.paths.keyFile)).toBe(false);
    expect(await fileExists(harness.paths.databaseFile)).toBe(false);
  });

  it("已经设置过时再次设置被拒绝", async () => {
    const service = await startService(getHarness());
    await service.setupWithMasterPassword(TEST_MASTER_PASSWORD);

    expect(await service.setupWithMasterPassword(TEST_MASTER_PASSWORD)).toEqual(
      { ok: false, reason: "unexpected-state" },
    );
    expect(await service.setupWithoutMasterPassword()).toEqual({
      ok: false,
      reason: "unexpected-state",
    });
  });
});

describe("VaultService 跳过主密码", () => {
  const getHarness = useVaultServiceHarness();

  it("跳过后进入已解锁状态, 密钥文件是系统保护方式", async () => {
    const harness = getHarness();
    const service = await startService(harness);

    const result = await service.setupWithoutMasterPassword();

    expect(result).toEqual({ ok: true });
    expect(service.getStatus()).toBe("unlocked");
    expect((await harness.keyFileStore.read())?.protection).toBe(
      "system-protected",
    );
    expect(await fileExists(harness.paths.databaseFile)).toBe(true);
  });

  it("系统不能保护数据密钥时拒绝跳过, 不创建任何文件", async () => {
    const harness = getHarness();
    const service = await startService(harness, {
      safeStorage: {
        isAsyncEncryptionAvailable: () => Promise.resolve(false),
        encryptStringAsync: () => Promise.reject(new Error("不应被调用")),
        decryptStringAsync: () => Promise.reject(new Error("不应被调用")),
      },
    });

    const result = await service.setupWithoutMasterPassword();

    expect(result).toEqual({
      ok: false,
      reason: "system-protection-unavailable",
    });
    expect(service.getStatus()).toBe("needs-setup");
    expect(await fileExists(harness.paths.keyFile)).toBe(false);
  });

  it("跳过主密码时重启后直接是 unlocked", async () => {
    const harness = getHarness();
    await prepareSystemProtectedVault(harness);

    const restarted = await startService(harness);

    expect(restarted.getStatus()).toBe("unlocked");
  });
});

describe("VaultService 重启后解锁", () => {
  const getHarness = useVaultServiceHarness();

  it("设了主密码时重启后是 locked", async () => {
    const harness = getHarness();
    await prepareMasterPasswordVault(harness);

    const restarted = await startService(harness);

    expect(restarted.getStatus()).toBe("locked");
  });

  it("错误主密码被拒绝并保持锁定, 正确主密码解锁", async () => {
    const harness = getHarness();
    await prepareMasterPasswordVault(harness);
    const restarted = await startService(harness);

    const rejected = await restarted.unlock(`${TEST_MASTER_PASSWORD}!`);
    expect(rejected).toEqual({ ok: false, reason: "wrong-password" });
    expect(restarted.getStatus()).toBe("locked");

    const accepted = await restarted.unlock(TEST_MASTER_PASSWORD);
    expect(accepted).toEqual({ ok: true });
    expect(restarted.getStatus()).toBe("unlocked");
  });
});

describe("VaultService 不合时宜的解锁", () => {
  const getHarness = useVaultServiceHarness();

  it("没有设置过时解锁被拒绝", async () => {
    const service = await startService(getHarness());

    expect(await service.unlock(TEST_MASTER_PASSWORD)).toEqual({
      ok: false,
      reason: "unexpected-state",
    });
  });

  it("已经解锁时再次解锁被拒绝", async () => {
    const harness = getHarness();
    await prepareMasterPasswordVault(harness);
    const restarted = await startService(harness);
    await restarted.unlock(TEST_MASTER_PASSWORD);

    expect(await restarted.unlock(TEST_MASTER_PASSWORD)).toEqual({
      ok: false,
      reason: "unexpected-state",
    });
  });
});
