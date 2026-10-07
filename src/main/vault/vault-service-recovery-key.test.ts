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
 * 查看后数据库里仍然读得到的标记数据.
 */
const PROBE_ROWS = [{ value: RECOVERY_PROBE_VALUE }];

describe("VaultService 查看恢复密钥: 与首次展示的词一致", () => {
  const getHarness = useVaultServiceHarness();

  it("主密码模式: 输入当前主密码得到首次设置时给出的词", async () => {
    const harness = getHarness();
    const words = await prepareVaultWithProbe(harness, "master-password");
    const service = await startService(harness);
    await service.unlock(TEST_MASTER_PASSWORD);

    const result = await service.viewRecoveryKey(TEST_MASTER_PASSWORD);

    expect(result).toEqual({ ok: true, recoveryWords: words });
    expect(service.getStatus()).toBe("unlocked");
  });

  it("系统保护模式: 不需要主密码, 得到首次设置时给出的词", async () => {
    const harness = getHarness();
    const words = await prepareVaultWithProbe(harness, "system");
    const service = await startService(harness);

    const result = await service.viewRecoveryKey(undefined);

    expect(result).toEqual({ ok: true, recoveryWords: words });
  });

  it("得到的词能经现有恢复逻辑还原同一个数据密钥并打开数据库", async () => {
    const harness = getHarness();
    await prepareVaultWithProbe(harness, "system");
    const service = await startService(harness);
    const result = await service.viewRecoveryKey(undefined);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const recovery = await recoverDataKey(
        result.recoveryWords,
        harness.paths.databaseFile,
      );
      expect(recovery.ok).toBe(true);
      if (recovery.ok) {
        recovery.dataKey.fill(0);
      }
    }
  });
});

describe("VaultService 查看恢复密钥: 切换与重启后词不变", () => {
  const getHarness = useVaultServiceHarness();

  it("开启主密码后用新主密码查看, 词不变", async () => {
    const harness = getHarness();
    const words = await prepareVaultWithProbe(harness, "system");
    const service = await startService(harness);
    await service.enableMasterPassword(NEW_MASTER_PASSWORD);

    const result = await service.viewRecoveryKey(NEW_MASTER_PASSWORD);

    expect(result).toEqual({ ok: true, recoveryWords: words });
  });

  it("关闭主密码后不需要主密码查看, 词不变", async () => {
    const harness = getHarness();
    const words = await prepareVaultWithProbe(harness, "master-password");
    const service = await startService(harness);
    await service.unlock(TEST_MASTER_PASSWORD);
    await service.disableMasterPassword(TEST_MASTER_PASSWORD);

    const result = await service.viewRecoveryKey(undefined);

    expect(result).toEqual({ ok: true, recoveryWords: words });
  });

  it("重启应用后再次查看, 词不变", async () => {
    const harness = getHarness();
    const words = await prepareVaultWithProbe(harness, "system");
    const first = await startService(harness);
    await first.viewRecoveryKey(undefined);
    first.close();

    const restarted = await startService(harness);

    expect(await restarted.viewRecoveryKey(undefined)).toEqual({
      ok: true,
      recoveryWords: words,
    });
  });
});

describe("VaultService 查看恢复密钥: 失败不改变保险库状态", () => {
  const getHarness = useVaultServiceHarness();

  it("主密码错误时失败, 保持已解锁, 密钥文件原样, 不触发失败回调", async () => {
    const harness = getHarness();
    await prepareVaultWithProbe(harness, "master-password");
    const service = await startService(harness);
    await service.unlock(TEST_MASTER_PASSWORD);
    const before = await harness.keyFileStore.read();

    const result = await service.viewRecoveryKey(NEW_MASTER_PASSWORD);

    expect(result).toEqual({ ok: false, reason: "wrong-password" });
    expect(service.getStatus()).toBe("unlocked");
    expect(harness.failures).toHaveLength(0);
    expect(await harness.keyFileStore.read()).toEqual(before);
    expect(readRecoveryProbe(service)).toEqual(PROBE_ROWS);
  });

  it("没有解锁时拒绝, 保持锁定", async () => {
    const harness = getHarness();
    await prepareVaultWithProbe(harness, "master-password");
    const service = await startService(harness);

    const result = await service.viewRecoveryKey(TEST_MASTER_PASSWORD);

    expect(result).toEqual({ ok: false, reason: "unexpected-state" });
    expect(service.getStatus()).toBe("locked");
  });

  it("读取失败时保持已解锁, 不进失败状态, 重试可以成功", async () => {
    const harness = getHarness();
    const words = await prepareVaultWithProbe(harness, "system");
    const service = await startService(harness);
    vi.spyOn(harness.keyFileStore, "read").mockRejectedValueOnce(
      new Error("磁盘读取失败"),
    );

    const failed = await service.viewRecoveryKey(undefined);
    const retried = await service.viewRecoveryKey(undefined);

    expect(failed).toEqual({ ok: false, reason: "unexpected-error" });
    expect(service.getStatus()).toBe("unlocked");
    expect(harness.failures).toHaveLength(1);
    expect(retried).toEqual({ ok: true, recoveryWords: words });
    expect(readRecoveryProbe(service)).toEqual(PROBE_ROWS);
  });
});
