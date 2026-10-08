import type { RecoveryBridge } from "@shared/vault/recovery-bridge";
import type { VaultBridge } from "@shared/vault/vault-bridge";
import type { VaultFailureInfo } from "@shared/vault/vault-failure";
import {
  VAULT_OPERATION_SUCCEEDED,
  vaultOperationFailed,
} from "@shared/vault/vault-operation-result";
import type { VaultStatus } from "@shared/vault/vault-status";
import { describe, expect, it, vi } from "vitest";

import { createVaultStore, type VaultStore } from "./vault-store";

/**
 * 假桥给出的失败信息: 密钥文件在而数据库文件缺失.
 */
const MISSING_DATABASE: VaultFailureInfo = {
  cause: "database-missing",
  stage: "startup",
  errorName: undefined,
};

/**
 * 创建带间谍方法的假保险库桥, 方法默认都成功.
 * @param overrides 覆盖桥上的方法.
 * @returns 假桥.
 */
function createBridge(overrides: Partial<VaultBridge> = {}): VaultBridge {
  return {
    getStatus: vi.fn(() => Promise.resolve("locked" as VaultStatus)),
    getFailure: vi.fn(() => Promise.resolve(MISSING_DATABASE)),
    setupWithMasterPassword: vi.fn(() =>
      Promise.resolve({ ok: true as const, recoveryWords: [] }),
    ),
    setupWithoutMasterPassword: vi.fn(() =>
      Promise.resolve({ ok: true as const, recoveryWords: [] }),
    ),
    unlock: vi.fn(() => Promise.resolve(VAULT_OPERATION_SUCCEEDED)),
    lock: vi.fn(() => Promise.resolve(VAULT_OPERATION_SUCCEEDED)),
    ...overrides,
  };
}

/**
 * 创建假恢复桥, 恢复默认成功.
 * @param overrides 覆盖桥上的方法.
 * @returns 假恢复桥.
 */
function createRecoveryBridge(
  overrides: Partial<RecoveryBridge> = {},
): RecoveryBridge {
  return {
    verifyWords: vi.fn(() => Promise.resolve(VAULT_OPERATION_SUCCEEDED)),
    restoreWithMasterPassword: vi.fn(() =>
      Promise.resolve(VAULT_OPERATION_SUCCEEDED),
    ),
    restoreWithoutMasterPassword: vi.fn(() =>
      Promise.resolve(VAULT_OPERATION_SUCCEEDED),
    ),
    saveTextFile: vi.fn(() => Promise.resolve("saved" as const)),
    viewKey: vi.fn(() =>
      Promise.resolve({ ok: true as const, recoveryWords: [] }),
    ),
    ...overrides,
  };
}

/**
 * 创建保险库 store.
 * @param bridge 假保险库桥.
 * @param initialStatus 初始状态.
 * @param initialFailure 初始失败信息.
 * @param recoveryBridge 假恢复桥.
 * @returns 保险库 store.
 */
function createStoreWith(
  bridge: VaultBridge,
  initialStatus: VaultStatus,
  initialFailure?: VaultFailureInfo,
  recoveryBridge: RecoveryBridge = createRecoveryBridge(),
): VaultStore {
  return createVaultStore({
    bridge,
    recoveryBridge,
    initialStatus,
    initialFailure,
  });
}

describe("createVaultStore 失败信息的来源", () => {
  it("初始失败信息取自启动时的读取结果, 没给时为 undefined", () => {
    const withFailure = createStoreWith(
      createBridge(),
      "failed",
      MISSING_DATABASE,
    );
    const without = createStoreWith(createBridge(), "locked");

    expect(withFailure.getState().failure).toEqual(MISSING_DATABASE);
    expect(without.getState().failure).toBeUndefined();
  });

  it("意外错误使状态变为 failed 并取回失败信息", async () => {
    const bridge = createBridge({
      unlock: () => Promise.resolve(vaultOperationFailed("unexpected-error")),
    });
    const store = createStoreWith(bridge, "locked");

    await store.getState().unlock("password-1");

    expect(store.getState().status).toBe("failed");
    expect(bridge.getFailure).toHaveBeenCalledTimes(1);
    expect(store.getState().failure).toEqual(MISSING_DATABASE);
  });

  it("状态不符且主进程报告 failed 时取回失败信息", async () => {
    const bridge = createBridge({
      getStatus: () => Promise.resolve("failed"),
      unlock: () => Promise.resolve(vaultOperationFailed("unexpected-state")),
    });
    const store = createStoreWith(bridge, "locked");

    await store.getState().unlock("password-1");

    expect(store.getState().status).toBe("failed");
    expect(store.getState().failure).toEqual(MISSING_DATABASE);
  });
});

describe("createVaultStore 失败信息的边界", () => {
  it("状态不符但主进程报告的不是 failed 时不取失败信息", async () => {
    const bridge = createBridge({
      getStatus: () => Promise.resolve("unlocked"),
      unlock: () => Promise.resolve(vaultOperationFailed("unexpected-state")),
    });
    const store = createStoreWith(bridge, "locked");

    await store.getState().unlock("password-1");

    expect(store.getState().status).toBe("unlocked");
    expect(bridge.getFailure).not.toHaveBeenCalled();
    expect(store.getState().failure).toBeUndefined();
  });

  it("取失败信息被拒绝时状态仍是 failed, 失败信息为 undefined", async () => {
    const bridge = createBridge({
      getFailure: () => Promise.reject(new Error("ipc down")),
      unlock: () => Promise.resolve(vaultOperationFailed("unexpected-error")),
    });
    const store = createStoreWith(bridge, "locked");

    await store.getState().unlock("password-1");

    expect(store.getState().status).toBe("failed");
    expect(store.getState().failure).toBeUndefined();
  });
});

describe("createVaultStore 失败信息的作废", () => {
  it("凭恢复词恢复成功后状态变为 unlocked, 失败信息作废", async () => {
    const store = createStoreWith(createBridge(), "failed", MISSING_DATABASE);

    await store.getState().restoreWithoutMasterPassword(["one"]);

    expect(store.getState().status).toBe("unlocked");
    expect(store.getState().failure).toBeUndefined();
  });
});
