import { describe, expect, it, vi } from "vitest";

import {
  RECOVERY_PROBE_VALUE,
  readRecoveryProbe,
  startUnlockedProbeService,
} from "../testing/recovery-vault-fixtures";
import { useVaultServiceHarness } from "../testing/vault-service-harness";
import { createLockRegistry, type LockRegistry } from "./lock-registry";

/**
 * 有任务进行中的锁定登记处与它的释放动作间谍.
 */
interface BusyRegistry {
  /**
   * 锁定登记处, 里面登记了一个永远忙碌的探测.
   */
  readonly registry: LockRegistry;
  /**
   * 登记的释放动作间谍.
   */
  readonly release: () => void;
}

/**
 * 创建有任务进行中的锁定登记处, 并带一个释放动作的间谍.
 * @returns 登记处与释放动作间谍.
 */
function createBusyRegistry(): BusyRegistry {
  const registry = createLockRegistry();
  const release = vi.fn();
  registry.addBusyProbe(() => true);
  registry.addReleaser(release);
  return { registry, release };
}

describe("VaultService 锁定: 忽略进行中的任务", () => {
  const getHarness = useVaultServiceHarness();

  it("不给选项时有任务进行中仍拒绝, 状态与数据不变", async () => {
    const { registry, release } = createBusyRegistry();
    const service = await startUnlockedProbeService(
      getHarness(),
      "master-password",
      { lockRegistry: registry },
    );

    const result = await service.lock();

    expect(result).toEqual({ ok: false, reason: "tasks-running" });
    expect(service.getStatus()).toBe("unlocked");
    expect(release).not.toHaveBeenCalled();
  });

  it("要求忽略任务时直接锁定, 关库并执行释放动作", async () => {
    const { registry, release } = createBusyRegistry();
    const service = await startUnlockedProbeService(
      getHarness(),
      "master-password",
      { lockRegistry: registry },
    );

    const result = await service.lock({ shouldIgnoreRunningTasks: true });

    expect(result).toEqual({ ok: true });
    expect(service.getStatus()).toBe("locked");
    expect(service.getOrm()).toBeUndefined();
    expect(release).toHaveBeenCalledTimes(1);
  });
});

describe("VaultService 锁定: 忽略任务选项的边界", () => {
  const getHarness = useVaultServiceHarness();

  it("明确给 false 时与不给选项相同, 仍拒绝", async () => {
    const { registry } = createBusyRegistry();
    const service = await startUnlockedProbeService(
      getHarness(),
      "master-password",
      { lockRegistry: registry },
    );

    const result = await service.lock({ shouldIgnoreRunningTasks: false });

    expect(result).toEqual({ ok: false, reason: "tasks-running" });
    expect(service.getStatus()).toBe("unlocked");
  });

  it("忽略任务不绕过保护方式的判断: 未设主密码仍拒绝, 数据不变", async () => {
    const { registry } = createBusyRegistry();
    const service = await startUnlockedProbeService(getHarness(), "system", {
      lockRegistry: registry,
    });

    const result = await service.lock({ shouldIgnoreRunningTasks: true });

    expect(result).toEqual({ ok: false, reason: "master-password-required" });
    expect(service.getStatus()).toBe("unlocked");
    expect(readRecoveryProbe(service)).toEqual([
      { value: RECOVERY_PROBE_VALUE },
    ]);
  });

  it("已锁定时再要求忽略任务锁定, 按状态不符拒绝", async () => {
    const service = await startUnlockedProbeService(
      getHarness(),
      "master-password",
    );
    await service.lock();

    const result = await service.lock({ shouldIgnoreRunningTasks: true });

    expect(result).toEqual({ ok: false, reason: "unexpected-state" });
    expect(service.getStatus()).toBe("locked");
  });
});
