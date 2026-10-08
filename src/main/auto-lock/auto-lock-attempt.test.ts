import { describe, expect, it, vi, type Mock } from "vitest";

import {
  VAULT_OPERATION_SUCCEEDED,
  vaultOperationFailed,
  type VaultFailureReason,
  type VaultOperationResult,
} from "@shared/vault/vault-operation-result";

import type { VaultLockOptions } from "../vault/vault-locker";
import { attemptAutoLock, type AutoLockVaultPort } from "./auto-lock-attempt";
import { AUTO_LOCK_DEFERRAL_LIMIT_CHECKS } from "./auto-lock-timing";

/**
 * 假锁定入口间谍的类型.
 */
type LockSpy = Mock<
  (options: VaultLockOptions) => Promise<VaultOperationResult>
>;

/**
 * 带锁定间谍的假保险库.
 */
interface FakeVault {
  /**
   * 交给被测函数的保险库.
   */
  readonly vault: AutoLockVaultPort;
  /**
   * 锁定入口间谍.
   */
  readonly lock: LockSpy;
}

/**
 * 创建带间谍的假保险库.
 * @param lockResult 假锁定入口的返回.
 * @param isUnlocked 失败之后保险库是否仍已解锁.
 * @returns 假保险库与锁定间谍.
 */
function createVault(
  lockResult: () => Promise<VaultOperationResult>,
  isUnlocked = true,
): FakeVault {
  const lock: LockSpy = vi.fn(lockResult);
  return { vault: { isUnlocked: () => isUnlocked, lock }, lock };
}

describe("attemptAutoLock", () => {
  it("锁定成功归为 locked", async () => {
    const { vault } = createVault(() =>
      Promise.resolve(VAULT_OPERATION_SUCCEEDED),
    );

    expect(await attemptAutoLock(vault, 0)).toBe("locked");
  });

  it.each<[VaultFailureReason, boolean, string]>([
    ["tasks-running", true, "deferred"],
    ["master-password-required", true, "not-applicable"],
    ["unexpected-state", true, "deferred"],
    ["unexpected-state", false, "dropped"],
    ["unexpected-error", true, "dropped"],
    ["wrong-password", true, "dropped"],
  ])(
    "失败原因 %s (之后仍解锁: %s) 归为 %s",
    async (reason, isUnlocked, expected) => {
      const { vault } = createVault(
        () => Promise.resolve(vaultOperationFailed(reason)),
        isUnlocked,
      );

      expect(await attemptAutoLock(vault, 0)).toBe(expected);
    },
  );

  it("锁定请求抛错按被挡住处理, 不外泄", async () => {
    const { vault } = createVault(() => Promise.reject(new Error("意外")));

    expect(await attemptAutoLock(vault, 0)).toBe("deferred");
  });

  it("被挡住的次数未到上限时不要求忽略任务, 到上限时要求", async () => {
    const { vault, lock } = createVault(() =>
      Promise.resolve(VAULT_OPERATION_SUCCEEDED),
    );

    await attemptAutoLock(vault, AUTO_LOCK_DEFERRAL_LIMIT_CHECKS - 1);
    await attemptAutoLock(vault, AUTO_LOCK_DEFERRAL_LIMIT_CHECKS);

    expect(lock.mock.calls).toEqual([
      [{ shouldIgnoreRunningTasks: false }],
      [{ shouldIgnoreRunningTasks: true }],
    ]);
  });
});
