import { sql } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

import {
  RECOVERY_PROBE_VALUE,
  prepareVaultWithProbe,
  readRecoveryProbe,
  startUnlockedProbeService,
} from "../testing/recovery-vault-fixtures";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";
import { createLockRegistry } from "./lock-registry";

/**
 * 锁定后数据库里仍然读得到的标记数据.
 */
const PROBE_ROWS = [{ value: RECOVERY_PROBE_VALUE }];

describe("VaultService 锁定: 状态与连接", () => {
  const getHarness = useVaultServiceHarness();

  it("锁定后状态为已锁定, 查询入口取不到", async () => {
    const service = await startUnlockedProbeService(
      getHarness(),
      "master-password",
    );

    const result = await service.lock();

    expect(result).toEqual({ ok: true });
    expect(service.getStatus()).toBe("locked");
    expect(service.getOrm()).toBeUndefined();
    expect(readRecoveryProbe(service)).toBeUndefined();
  });

  it("锁定前拿到的查询入口在锁定后不能再读数据, 连接已关闭", async () => {
    const service = await startUnlockedProbeService(
      getHarness(),
      "master-password",
    );
    const oldOrm = service.getOrm();
    const readWithOldConnection = (): unknown =>
      oldOrm?.all(sql`select value from recovery_probe`);
    expect(readWithOldConnection()).toEqual(PROBE_ROWS);

    await service.lock();

    expect(readWithOldConnection).toThrow();
  });

  it("不改动密钥文件, 不写失败回调", async () => {
    const harness = getHarness();
    const service = await startUnlockedProbeService(harness, "master-password");
    const before = await harness.keyFileStore.read();

    await service.lock();

    expect(await harness.keyFileStore.read()).toEqual(before);
    expect(harness.failures).toEqual([]);
  });
});

describe("VaultService 锁定: 之后重新解锁", () => {
  const getHarness = useVaultServiceHarness();

  it("锁定后用主密码重新解锁, 数据都在", async () => {
    const service = await startUnlockedProbeService(
      getHarness(),
      "master-password",
    );
    await service.lock();

    const result = await service.unlock(TEST_MASTER_PASSWORD);

    expect(result).toEqual({ ok: true });
    expect(service.getStatus()).toBe("unlocked");
    expect(readRecoveryProbe(service)).toEqual(PROBE_ROWS);
  });

  it("锁定后输错主密码仍是已锁定, 数据取不到", async () => {
    const service = await startUnlockedProbeService(
      getHarness(),
      "master-password",
    );
    await service.lock();

    const result = await service.unlock("a wrong password entirely");

    expect(result).toEqual({ ok: false, reason: "wrong-password" });
    expect(service.getStatus()).toBe("locked");
    expect(service.getOrm()).toBeUndefined();
  });

  it("可以反复锁定与解锁", async () => {
    const service = await startUnlockedProbeService(
      getHarness(),
      "master-password",
    );

    await service.lock();
    await service.unlock(TEST_MASTER_PASSWORD);
    const secondLock = await service.lock();
    const secondUnlock = await service.unlock(TEST_MASTER_PASSWORD);

    expect(secondLock).toEqual({ ok: true });
    expect(secondUnlock).toEqual({ ok: true });
    expect(readRecoveryProbe(service)).toEqual(PROBE_ROWS);
  });
});

describe("VaultService 锁定: 释放动作", () => {
  const getHarness = useVaultServiceHarness();

  it("锁定时执行登记的释放动作, 抛错的动作不阻止锁定", async () => {
    const lockRegistry = createLockRegistry();
    const release = vi.fn();
    lockRegistry.addReleaser(() => {
      throw new Error("释放失败");
    });
    lockRegistry.addReleaser(release);
    const service = await startUnlockedProbeService(
      getHarness(),
      "master-password",
      { lockRegistry },
    );

    const result = await service.lock();

    expect(result).toEqual({ ok: true });
    expect(service.getStatus()).toBe("locked");
    expect(release).toHaveBeenCalledTimes(1);
  });
});

describe("VaultService 锁定: 因保护方式与任务被拒绝", () => {
  const getHarness = useVaultServiceHarness();

  it("未设主密码 (系统保护) 的保险库拒绝锁定, 状态与数据不变", async () => {
    const service = await startUnlockedProbeService(getHarness(), "system");

    const result = await service.lock();

    expect(result).toEqual({ ok: false, reason: "master-password-required" });
    expect(service.getStatus()).toBe("unlocked");
    expect(readRecoveryProbe(service)).toEqual(PROBE_ROWS);
  });

  it("有任务进行中时拒绝锁定, 状态与数据不变, 不执行释放动作", async () => {
    const lockRegistry = createLockRegistry();
    let isBusy = true;
    const release = vi.fn();
    lockRegistry.addBusyProbe(() => isBusy);
    lockRegistry.addReleaser(release);
    const service = await startUnlockedProbeService(
      getHarness(),
      "master-password",
      { lockRegistry },
    );

    const refused = await service.lock();

    expect(refused).toEqual({ ok: false, reason: "tasks-running" });
    expect(service.getStatus()).toBe("unlocked");
    expect(readRecoveryProbe(service)).toEqual(PROBE_ROWS);
    expect(release).not.toHaveBeenCalled();
    isBusy = false;
    expect(await service.lock()).toEqual({ ok: true });
    expect(release).toHaveBeenCalledTimes(1);
  });
});

describe("VaultService 锁定: 因状态与密钥文件被拒绝", () => {
  const getHarness = useVaultServiceHarness();

  it("已锁定时再锁定按状态不符拒绝", async () => {
    const harness = getHarness();
    await prepareVaultWithProbe(harness, "master-password");
    const service = await startService(harness);

    const result = await service.lock();

    expect(result).toEqual({ ok: false, reason: "unexpected-state" });
    expect(service.getStatus()).toBe("locked");
  });

  it("尚未设置的保险库按状态不符拒绝", async () => {
    const service = await startService(getHarness());

    const result = await service.lock();

    expect(result).toEqual({ ok: false, reason: "unexpected-state" });
    expect(service.getStatus()).toBe("needs-setup");
  });

  it("密钥文件读不出时拒绝锁定, 保持已解锁", async () => {
    const harness = getHarness();
    const service = await startUnlockedProbeService(harness, "master-password");
    vi.spyOn(harness.keyFileStore, "read").mockRejectedValueOnce(
      new Error("磁盘读取失败"),
    );

    const result = await service.lock();

    expect(result).toEqual({ ok: false, reason: "master-password-required" });
    expect(service.getStatus()).toBe("unlocked");
    expect(readRecoveryProbe(service)).toEqual(PROBE_ROWS);
  });
});

describe("VaultService 锁定: 与进行中的操作互斥", () => {
  const getHarness = useVaultServiceHarness();

  it("查看恢复密钥进行中时拒绝锁定, 查看完成后可以锁定", async () => {
    const service = await startUnlockedProbeService(
      getHarness(),
      "master-password",
    );

    const viewing = service.viewRecoveryKey(TEST_MASTER_PASSWORD);
    const refused = await service.lock();
    const viewed = await viewing;

    expect(refused).toEqual({ ok: false, reason: "unexpected-state" });
    expect(viewed.ok).toBe(true);
    expect(service.getStatus()).toBe("unlocked");
    expect(await service.lock()).toEqual({ ok: true });
  });

  it("关闭主密码进行中时拒绝锁定, 关闭完成后保险库改为系统保护", async () => {
    const service = await startUnlockedProbeService(
      getHarness(),
      "master-password",
    );

    const disabling = service.disableMasterPassword(TEST_MASTER_PASSWORD);
    const refused = await service.lock();
    const disabled = await disabling;

    expect(refused).toEqual({ ok: false, reason: "unexpected-state" });
    expect(disabled).toEqual({ ok: true });
    expect(service.getStatus()).toBe("unlocked");
    expect(await service.lock()).toEqual({
      ok: false,
      reason: "master-password-required",
    });
  });
});

describe("VaultService 锁定: 锁定进行中时拒绝其它操作", () => {
  const getHarness = useVaultServiceHarness();

  it("锁定进行中时拒绝查看恢复密钥与切换主密码", async () => {
    const service = await startUnlockedProbeService(
      getHarness(),
      "master-password",
    );

    const locking = service.lock();
    const viewRefused = await service.viewRecoveryKey(TEST_MASTER_PASSWORD);
    const switchRefused =
      await service.disableMasterPassword(TEST_MASTER_PASSWORD);
    const locked = await locking;

    expect(viewRefused).toEqual({ ok: false, reason: "unexpected-state" });
    expect(switchRefused).toEqual({ ok: false, reason: "unexpected-state" });
    expect(locked).toEqual({ ok: true });
    expect(service.getStatus()).toBe("locked");
  });

  it("两次锁定同时发起时第二次被拒绝", async () => {
    const service = await startUnlockedProbeService(
      getHarness(),
      "master-password",
    );

    const [first, second] = await Promise.all([service.lock(), service.lock()]);

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: false, reason: "unexpected-state" });
  });

  it("锁定结束后互斥已释放, 解锁与查看恢复密钥不受影响", async () => {
    const service = await startUnlockedProbeService(
      getHarness(),
      "master-password",
    );
    await service.lock();

    const unlocked = await service.unlock(TEST_MASTER_PASSWORD);
    const viewed = await service.viewRecoveryKey(TEST_MASTER_PASSWORD);

    expect(unlocked).toEqual({ ok: true });
    expect(viewed.ok).toBe(true);
  });
});
