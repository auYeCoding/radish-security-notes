import { describe, expect, it } from "vitest";

import { vaultOperationFailed } from "@shared/vault/vault-operation-result";
import type { VaultStatus } from "@shared/vault/vault-status";
import {
  TEST_RECOVERY_WORDS,
  createVaultTestEnvironment,
  type VaultTestEnvironment,
} from "@renderer/testing/vault-test-environment";

/**
 * 创建指定初始状态的保险库测试环境.
 * @param status 初始状态.
 * @returns 保险库测试环境.
 */
function createEnvironment(status: VaultStatus): Promise<VaultTestEnvironment> {
  return createVaultTestEnvironment({ status });
}

describe("保险库 store: 跟上主进程的自动锁定", () => {
  it.each(["idle", "screen-lock", "sleep"] as const)(
    "已解锁时收到原因 %s, 状态变为已锁定并记下原因",
    async (reason) => {
      const { vaultStore } = await createEnvironment("unlocked");

      vaultStore.getState().applyAutoLock(reason);

      expect(vaultStore.getState().status).toBe("locked");
      expect(vaultStore.getState().lockReason).toBe(reason);
    },
  );

  it("初始没有锁定原因", async () => {
    const { vaultStore } = await createEnvironment("locked");

    expect(vaultStore.getState().lockReason).toBeUndefined();
  });

  it("清除待确认的恢复词与恢复请求, 与手动锁定成功后的状态一致", async () => {
    const { vaultStore } = await createEnvironment("needs-setup");
    await vaultStore.getState().setupWithMasterPassword("a long password");
    expect(vaultStore.getState().pendingRecoveryWords).toEqual(
      TEST_RECOVERY_WORDS,
    );

    vaultStore.getState().applyAutoLock("idle");

    expect(vaultStore.getState().status).toBe("locked");
    expect(vaultStore.getState().pendingRecoveryWords).toBeUndefined();
    expect(vaultStore.getState().isRestoreRequested).toBe(false);
  });
});

describe("保险库 store: 自动锁定的忽略与清除", () => {
  it.each(["locked", "failed", "needs-setup"] as const)(
    "当前是 %s 时忽略, 状态与原因都不变",
    async (status) => {
      const { vaultStore } = await createEnvironment(status);

      vaultStore.getState().applyAutoLock("sleep");

      expect(vaultStore.getState().status).toBe(status);
      expect(vaultStore.getState().lockReason).toBeUndefined();
    },
  );

  it("手动锁定不记原因", async () => {
    const { vaultStore } = await createEnvironment("unlocked");

    await vaultStore.getState().lock();

    expect(vaultStore.getState().status).toBe("locked");
    expect(vaultStore.getState().lockReason).toBeUndefined();
  });

  it("解锁成功后清除原因, 再次手动锁定也不会带上旧原因", async () => {
    const { vaultStore } = await createEnvironment("unlocked");
    vaultStore.getState().applyAutoLock("idle");

    await vaultStore.getState().unlock("a long password");
    expect(vaultStore.getState().status).toBe("unlocked");
    expect(vaultStore.getState().lockReason).toBeUndefined();

    await vaultStore.getState().lock();
    expect(vaultStore.getState().lockReason).toBeUndefined();
  });

  it("解锁失败 (主密码不对) 时原因保留, 解锁页继续说明", async () => {
    const environment = await createVaultTestEnvironment({
      status: "unlocked",
      bridgeOverrides: {
        unlock: () => Promise.resolve(vaultOperationFailed("wrong-password")),
      },
    });
    environment.vaultStore.getState().applyAutoLock("screen-lock");

    await environment.vaultStore.getState().unlock("wrong password");

    expect(environment.vaultStore.getState().status).toBe("locked");
    expect(environment.vaultStore.getState().lockReason).toBe("screen-lock");
  });
});
