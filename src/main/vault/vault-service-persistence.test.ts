import { describe, expect, it } from "vitest";

import {
  prepareMasterPasswordVault,
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";
import { fileExists } from "./file-exists";

describe("VaultService 跳过时等系统密钥落盘", () => {
  const getHarness = useVaultServiceHarness();

  it("系统密钥没有落盘时拒绝跳过, 不创建任何文件", async () => {
    const harness = getHarness();
    const service = await startService(harness, {
      systemKeyPersistence: {
        waitUntilPersisted: () => Promise.resolve(false),
      },
    });

    const result = await service.setupWithoutMasterPassword();

    expect(result).toEqual({
      ok: false,
      reason: "system-protection-unavailable",
    });
    expect(service.getStatus()).toBe("needs-setup");
    expect(await fileExists(harness.paths.keyFile)).toBe(false);
    expect(await fileExists(harness.paths.databaseFile)).toBe(false);
  });

  it("等到系统密钥落盘之后才写入密钥文件", async () => {
    const harness = getHarness();
    let wasKeyFileWritten: boolean | undefined;
    const service = await startService(harness, {
      systemKeyPersistence: {
        waitUntilPersisted: async () => {
          wasKeyFileWritten = await fileExists(harness.paths.keyFile);
          return true;
        },
      },
    });

    await service.setupWithoutMasterPassword();

    expect(wasKeyFileWritten).toBe(false);
    expect(await fileExists(harness.paths.keyFile)).toBe(true);
  });

  it("设置主密码不需要等系统密钥", async () => {
    let waitCount = 0;
    const service = await startService(getHarness(), {
      systemKeyPersistence: {
        waitUntilPersisted: () => {
          waitCount += 1;
          return Promise.resolve(true);
        },
      },
    });

    await service.setupWithMasterPassword(TEST_MASTER_PASSWORD);

    expect(waitCount).toBe(0);
  });
});

describe("VaultService 同一时间只做一个操作", () => {
  const getHarness = useVaultServiceHarness();

  it("两次设置同时到达时只有一次生效, 之后该主密码仍能解锁", async () => {
    const harness = getHarness();
    const service = await startService(harness);

    const results = await Promise.all([
      service.setupWithMasterPassword(TEST_MASTER_PASSWORD),
      service.setupWithMasterPassword(TEST_MASTER_PASSWORD),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)).toEqual({
      ok: false,
      reason: "unexpected-state",
    });
    service.close();
    const restarted = await startService(harness);
    expect(restarted.getStatus()).toBe("locked");
    expect(await restarted.unlock(TEST_MASTER_PASSWORD)).toEqual({ ok: true });
  });

  it("两次解锁同时到达时只有一次生效", async () => {
    const harness = getHarness();
    await prepareMasterPasswordVault(harness);
    const service = await startService(harness);

    const results = await Promise.all([
      service.unlock(TEST_MASTER_PASSWORD),
      service.unlock(TEST_MASTER_PASSWORD),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(service.getStatus()).toBe("unlocked");
  });
});
