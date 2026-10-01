import type { VaultBridge } from "@shared/vault/vault-bridge";
import {
  VAULT_OPERATION_SUCCEEDED,
  vaultOperationFailed,
} from "@shared/vault/vault-operation-result";
import type { VaultStatus } from "@shared/vault/vault-status";
import { describe, expect, it, vi } from "vitest";

import { createVaultStore, type VaultStore } from "./vault-store";

/**
 * 创建带间谍方法的假保险库桥, 方法默认都成功.
 * @param overrides 覆盖桥上的方法.
 * @returns 假桥.
 */
function createBridge(overrides: Partial<VaultBridge> = {}): VaultBridge {
  return {
    getStatus: vi.fn(() => Promise.resolve("locked" as VaultStatus)),
    setupWithMasterPassword: vi.fn(() =>
      Promise.resolve(VAULT_OPERATION_SUCCEEDED),
    ),
    setupWithoutMasterPassword: vi.fn(() =>
      Promise.resolve(VAULT_OPERATION_SUCCEEDED),
    ),
    unlock: vi.fn(() => Promise.resolve(VAULT_OPERATION_SUCCEEDED)),
    ...overrides,
  };
}

/**
 * 用假桥创建保险库 store.
 * @param bridge 假桥.
 * @param initialStatus 初始状态.
 * @returns 保险库 store.
 */
function createStoreWith(
  bridge: VaultBridge,
  initialStatus: VaultStatus,
): VaultStore {
  return createVaultStore({ bridge, initialStatus });
}

describe("createVaultStore 成功路径", () => {
  it("初始状态取自主进程", () => {
    const store = createStoreWith(createBridge(), "needs-setup");

    expect(store.getState().status).toBe("needs-setup");
  });

  it("设置主密码成功后把密码交给桥, 状态变为 unlocked", async () => {
    const bridge = createBridge();
    const store = createStoreWith(bridge, "needs-setup");

    const result = await store.getState().setupWithMasterPassword("password-1");

    expect(result).toEqual({ ok: true });
    expect(bridge.setupWithMasterPassword).toHaveBeenCalledWith("password-1");
    expect(store.getState().status).toBe("unlocked");
  });

  it("跳过成功后状态变为 unlocked", async () => {
    const store = createStoreWith(createBridge(), "needs-setup");

    await store.getState().setupWithoutMasterPassword();

    expect(store.getState().status).toBe("unlocked");
  });

  it("解锁成功后状态变为 unlocked", async () => {
    const bridge = createBridge();
    const store = createStoreWith(bridge, "locked");

    await store.getState().unlock("password-1");

    expect(bridge.unlock).toHaveBeenCalledWith("password-1");
    expect(store.getState().status).toBe("unlocked");
  });
});

describe("createVaultStore 失败路径", () => {
  it("主密码不对时状态保持 locked", async () => {
    const store = createStoreWith(
      createBridge({
        unlock: () => Promise.resolve(vaultOperationFailed("wrong-password")),
      }),
      "locked",
    );

    const result = await store.getState().unlock("wrong");

    expect(result).toEqual({ ok: false, reason: "wrong-password" });
    expect(store.getState().status).toBe("locked");
  });

  it("主进程报告意外错误时状态变为 failed", async () => {
    const store = createStoreWith(
      createBridge({
        unlock: () => Promise.resolve(vaultOperationFailed("unexpected-error")),
      }),
      "locked",
    );

    await store.getState().unlock("password-1");

    expect(store.getState().status).toBe("failed");
  });

  it("主进程报告状态不符时重新向主进程取状态", async () => {
    const store = createStoreWith(
      createBridge({
        getStatus: () => Promise.resolve("unlocked"),
        unlock: () => Promise.resolve(vaultOperationFailed("unexpected-state")),
      }),
      "locked",
    );

    await store.getState().unlock("password-1");

    expect(store.getState().status).toBe("unlocked");
  });
});
