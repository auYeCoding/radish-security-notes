import { describe, expect, it, vi } from "vitest";

import {
  NEW_MASTER_PASSWORD,
  RECOVERY_PROBE_VALUE,
  prepareVaultWithProbe,
  readRecoveryProbe,
} from "../testing/recovery-vault-fixtures";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";
import { recoverDataKey } from "./recover-data-key";

/**
 * 切换后数据库里仍然读得到的标记数据.
 */
const PROBE_ROWS = [{ value: RECOVERY_PROBE_VALUE }];

describe("VaultService 开启主密码: 成功", () => {
  const getHarness = useVaultServiceHarness();

  it("当前会话保持解锁, 数据都在, 重启后要求主密码", async () => {
    const harness = getHarness();
    await prepareVaultWithProbe(harness, "system");
    const service = await startService(harness);

    const result = await service.enableMasterPassword(NEW_MASTER_PASSWORD);

    expect(result).toEqual({ ok: true });
    expect(service.getStatus()).toBe("unlocked");
    expect(readRecoveryProbe(service)).toEqual(PROBE_ROWS);
    service.close();
    const restarted = await startService(harness);
    expect(restarted.getStatus()).toBe("locked");
    expect(await restarted.unlock(NEW_MASTER_PASSWORD)).toEqual({ ok: true });
    expect(readRecoveryProbe(restarted)).toEqual(PROBE_ROWS);
  });

  it("开启后设置时给出的恢复词仍然有效", async () => {
    const harness = getHarness();
    const words = await prepareVaultWithProbe(harness, "system");
    const service = await startService(harness);
    await service.enableMasterPassword(NEW_MASTER_PASSWORD);
    service.close();

    const restarted = await startService(harness);

    expect(await restarted.verifyRecoveryWords(words)).toEqual({ ok: true });
  });
});

describe("VaultService 开启主密码: 失败", () => {
  const getHarness = useVaultServiceHarness();

  it("写入失败时保持已解锁, 不进失败状态, 密钥文件原样, 重试可以成功", async () => {
    const harness = getHarness();
    await prepareVaultWithProbe(harness, "system");
    const service = await startService(harness);
    const before = await harness.keyFileStore.read();
    vi.spyOn(harness.keyFileStore, "write").mockRejectedValueOnce(
      new Error("磁盘写入失败"),
    );

    const failed = await service.enableMasterPassword(NEW_MASTER_PASSWORD);

    expect(failed).toEqual({ ok: false, reason: "unexpected-error" });
    expect(service.getStatus()).toBe("unlocked");
    expect(harness.failures).toHaveLength(1);
    expect(await harness.keyFileStore.read()).toEqual(before);
    expect(readRecoveryProbe(service)).toEqual(PROBE_ROWS);
    expect(await service.enableMasterPassword(NEW_MASTER_PASSWORD)).toEqual({
      ok: true,
    });
  });

  it("新主密码不合规时失败, 状态与密钥文件不变", async () => {
    const harness = getHarness();
    await prepareVaultWithProbe(harness, "system");
    const service = await startService(harness);
    const before = await harness.keyFileStore.read();

    const result = await service.enableMasterPassword("short");

    expect(result).toEqual({ ok: false, reason: "password-too-short" });
    expect(service.getStatus()).toBe("unlocked");
    expect(await harness.keyFileStore.read()).toEqual(before);
  });

  it("没有解锁时拒绝", async () => {
    const harness = getHarness();
    await prepareVaultWithProbe(harness, "master-password");
    const service = await startService(harness);

    const result = await service.enableMasterPassword(NEW_MASTER_PASSWORD);

    expect(result).toEqual({ ok: false, reason: "unexpected-state" });
    expect(service.getStatus()).toBe("locked");
  });
});

describe("VaultService 关闭主密码: 成功", () => {
  const getHarness = useVaultServiceHarness();

  it("当前会话保持解锁, 数据都在, 重启后直接解锁", async () => {
    const harness = getHarness();
    await prepareVaultWithProbe(harness, "master-password");
    const service = await startService(harness);
    await service.unlock(TEST_MASTER_PASSWORD);

    const result = await service.disableMasterPassword(TEST_MASTER_PASSWORD);

    expect(result).toEqual({ ok: true });
    expect(service.getStatus()).toBe("unlocked");
    service.close();
    const restarted = await startService(harness);
    expect(restarted.getStatus()).toBe("unlocked");
    expect((await harness.keyFileStore.read())?.protection).toBe(
      "system-protected",
    );
    expect(readRecoveryProbe(restarted)).toEqual(PROBE_ROWS);
  });

  it("关闭后设置时给出的恢复词仍然有效", async () => {
    const harness = getHarness();
    const words = await prepareVaultWithProbe(harness, "master-password");
    const service = await startService(harness);
    await service.unlock(TEST_MASTER_PASSWORD);
    await service.disableMasterPassword(TEST_MASTER_PASSWORD);
    service.close();

    const recovery = await recoverDataKey(words, harness.paths.databaseFile);

    expect(recovery.ok).toBe(true);
    if (recovery.ok) {
      recovery.dataKey.fill(0);
    }
  });

  it("开启后可以再关闭, 数据都在", async () => {
    const harness = getHarness();
    await prepareVaultWithProbe(harness, "system");
    const service = await startService(harness);
    await service.enableMasterPassword(NEW_MASTER_PASSWORD);

    const result = await service.disableMasterPassword(NEW_MASTER_PASSWORD);

    expect(result).toEqual({ ok: true });
    service.close();
    const restarted = await startService(harness);
    expect(restarted.getStatus()).toBe("unlocked");
    expect(readRecoveryProbe(restarted)).toEqual(PROBE_ROWS);
  });
});

describe("VaultService 关闭主密码: 失败", () => {
  const getHarness = useVaultServiceHarness();

  it("当前主密码错误时失败, 保持已解锁与原模式", async () => {
    const harness = getHarness();
    await prepareVaultWithProbe(harness, "master-password");
    const service = await startService(harness);
    await service.unlock(TEST_MASTER_PASSWORD);
    const before = await harness.keyFileStore.read();

    const result = await service.disableMasterPassword(NEW_MASTER_PASSWORD);

    expect(result).toEqual({ ok: false, reason: "wrong-password" });
    expect(service.getStatus()).toBe("unlocked");
    expect(harness.failures).toHaveLength(0);
    expect(await harness.keyFileStore.read()).toEqual(before);
  });

  it("系统密钥等不到落盘时失败, 保持已解锁与原模式, 下次启动仍要求主密码", async () => {
    const harness = getHarness();
    await prepareVaultWithProbe(harness, "master-password");
    const service = await startService(harness, {
      systemKeyPersistence: {
        waitUntilPersisted: () => Promise.resolve(false),
      },
    });
    await service.unlock(TEST_MASTER_PASSWORD);
    const before = await harness.keyFileStore.read();

    const result = await service.disableMasterPassword(TEST_MASTER_PASSWORD);

    expect(result).toEqual({
      ok: false,
      reason: "system-protection-unavailable",
    });
    expect(service.getStatus()).toBe("unlocked");
    expect(await harness.keyFileStore.read()).toEqual(before);
    service.close();
    expect((await startService(harness)).getStatus()).toBe("locked");
  });

  it("写入失败时保持已解锁, 不进失败状态, 密钥文件原样", async () => {
    const harness = getHarness();
    await prepareVaultWithProbe(harness, "master-password");
    const service = await startService(harness);
    await service.unlock(TEST_MASTER_PASSWORD);
    const before = await harness.keyFileStore.read();
    vi.spyOn(harness.keyFileStore, "write").mockRejectedValueOnce(
      new Error("磁盘写入失败"),
    );

    const result = await service.disableMasterPassword(TEST_MASTER_PASSWORD);

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(service.getStatus()).toBe("unlocked");
    expect(await harness.keyFileStore.read()).toEqual(before);
    expect(readRecoveryProbe(service)).toEqual(PROBE_ROWS);
  });
});
