import type { RecoveryBridge } from "@shared/vault/recovery-bridge";
import type { VaultBridge } from "@shared/vault/vault-bridge";
import {
  VAULT_OPERATION_SUCCEEDED,
  vaultOperationFailed,
} from "@shared/vault/vault-operation-result";
import type { VaultSetupResult } from "@shared/vault/vault-setup-result";
import type { VaultStatus } from "@shared/vault/vault-status";
import { describe, expect, it, vi } from "vitest";

import { createVaultStore, type VaultStore } from "./vault-store";

/**
 * 假桥设置成功时给出的恢复词.
 */
const WORDS = ["one", "two", "three"];

/**
 * 假桥设置成功的结果.
 */
const SETUP_SUCCEEDED: VaultSetupResult = { ok: true, recoveryWords: WORDS };

/**
 * 创建带间谍方法的假保险库桥, 方法默认都成功.
 * @param overrides 覆盖桥上的方法.
 * @returns 假桥.
 */
function createBridge(overrides: Partial<VaultBridge> = {}): VaultBridge {
  return {
    getStatus: vi.fn(() => Promise.resolve("locked" as VaultStatus)),
    setupWithMasterPassword: vi.fn(() => Promise.resolve(SETUP_SUCCEEDED)),
    setupWithoutMasterPassword: vi.fn(() => Promise.resolve(SETUP_SUCCEEDED)),
    unlock: vi.fn(() => Promise.resolve(VAULT_OPERATION_SUCCEEDED)),
    lock: vi.fn(() => Promise.resolve(VAULT_OPERATION_SUCCEEDED)),
    ...overrides,
  };
}

/**
 * 创建带间谍方法的假恢复桥, 方法默认都成功.
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
    viewKey: vi.fn(() => Promise.resolve(SETUP_SUCCEEDED)),
    ...overrides,
  };
}

/**
 * 用假桥创建保险库 store.
 * @param bridge 假保险库桥.
 * @param initialStatus 初始状态.
 * @param recoveryBridge 假恢复桥.
 * @returns 保险库 store.
 */
function createStoreWith(
  bridge: VaultBridge,
  initialStatus: VaultStatus,
  recoveryBridge: RecoveryBridge = createRecoveryBridge(),
): VaultStore {
  return createVaultStore({ bridge, recoveryBridge, initialStatus });
}

describe("createVaultStore 成功路径", () => {
  it("初始状态取自主进程, 没有待确认的恢复词, 没有请求恢复", () => {
    const store = createStoreWith(createBridge(), "needs-setup");

    expect(store.getState().status).toBe("needs-setup");
    expect(store.getState().pendingRecoveryWords).toBeUndefined();
    expect(store.getState().isRestoreRequested).toBe(false);
  });

  it("设置主密码成功后把密码交给桥, 状态变为 unlocked 并记下待确认的恢复词", async () => {
    const bridge = createBridge();
    const store = createStoreWith(bridge, "needs-setup");

    const result = await store.getState().setupWithMasterPassword("password-1");

    expect(result).toEqual(SETUP_SUCCEEDED);
    expect(bridge.setupWithMasterPassword).toHaveBeenCalledWith("password-1");
    expect(store.getState().status).toBe("unlocked");
    expect(store.getState().pendingRecoveryWords).toEqual(WORDS);
  });

  it("跳过成功后状态变为 unlocked 并记下待确认的恢复词", async () => {
    const store = createStoreWith(createBridge(), "needs-setup");

    await store.getState().setupWithoutMasterPassword();

    expect(store.getState().status).toBe("unlocked");
    expect(store.getState().pendingRecoveryWords).toEqual(WORDS);
  });

  it("解锁成功后状态变为 unlocked, 不产生待确认的恢复词", async () => {
    const bridge = createBridge();
    const store = createStoreWith(bridge, "locked");

    await store.getState().unlock("password-1");

    expect(bridge.unlock).toHaveBeenCalledWith("password-1");
    expect(store.getState().status).toBe("unlocked");
    expect(store.getState().pendingRecoveryWords).toBeUndefined();
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

  it("设置失败时不记恢复词, 状态不变", async () => {
    const store = createStoreWith(
      createBridge({
        setupWithMasterPassword: () =>
          Promise.resolve(vaultOperationFailed("password-too-short")),
      }),
      "needs-setup",
    );

    await store.getState().setupWithMasterPassword("short");

    expect(store.getState().status).toBe("needs-setup");
    expect(store.getState().pendingRecoveryWords).toBeUndefined();
  });
});

describe("createVaultStore 锁定", () => {
  it("锁定成功后状态变为 locked, 并清除待确认的恢复词与恢复请求", async () => {
    const bridge = createBridge();
    const store = createStoreWith(bridge, "needs-setup");
    await store.getState().setupWithMasterPassword("password-1");
    store.getState().requestRestore();

    const result = await store.getState().lock();

    expect(result).toEqual(VAULT_OPERATION_SUCCEEDED);
    expect(bridge.lock).toHaveBeenCalledTimes(1);
    expect(store.getState().status).toBe("locked");
    expect(store.getState().pendingRecoveryWords).toBeUndefined();
    expect(store.getState().isRestoreRequested).toBe(false);
  });

  it("锁定后用主密码解锁可以回到 unlocked", async () => {
    const store = createStoreWith(createBridge(), "unlocked");
    await store.getState().lock();

    await store.getState().unlock("password-1");

    expect(store.getState().status).toBe("unlocked");
  });
});

describe("createVaultStore 锁定被拒绝或出错", () => {
  it.each(["tasks-running", "master-password-required"] as const)(
    "被拒绝 (%s) 时状态保持 unlocked, 不重新向主进程取状态",
    async (reason) => {
      const bridge = createBridge({
        lock: () => Promise.resolve(vaultOperationFailed(reason)),
      });
      const store = createStoreWith(bridge, "unlocked");

      const result = await store.getState().lock();

      expect(result).toEqual({ ok: false, reason });
      expect(store.getState().status).toBe("unlocked");
      expect(bridge.getStatus).not.toHaveBeenCalled();
    },
  );

  it("主进程报告状态不符时重新向主进程取状态", async () => {
    const store = createStoreWith(
      createBridge({
        getStatus: () => Promise.resolve("locked"),
        lock: () => Promise.resolve(vaultOperationFailed("unexpected-state")),
      }),
      "unlocked",
    );

    await store.getState().lock();

    expect(store.getState().status).toBe("locked");
  });

  it("主进程报告意外错误时状态变为 failed", async () => {
    const store = createStoreWith(
      createBridge({
        lock: () => Promise.resolve(vaultOperationFailed("unexpected-error")),
      }),
      "unlocked",
    );

    await store.getState().lock();

    expect(store.getState().status).toBe("failed");
  });
});

describe("createVaultStore 恢复词确认", () => {
  it("确认后丢弃待确认的恢复词, 状态仍是 unlocked", async () => {
    const store = createStoreWith(createBridge(), "needs-setup");
    await store.getState().setupWithMasterPassword("password-1");

    store.getState().confirmRecoveryWords();

    expect(store.getState().pendingRecoveryWords).toBeUndefined();
    expect(store.getState().status).toBe("unlocked");
  });

  it("保存文本文件直接交给恢复桥并返回状态", async () => {
    const recoveryBridge = createRecoveryBridge({
      saveTextFile: () => Promise.resolve("cancelled"),
    });
    const store = createStoreWith(
      createBridge(),
      "needs-setup",
      recoveryBridge,
    );

    expect(await store.getState().saveRecoveryTextFile(WORDS)).toBe(
      "cancelled",
    );
  });
});

describe("createVaultStore 查看恢复密钥", () => {
  it("把主密码交给恢复桥并原样返回带词的结果, 状态不变", async () => {
    const recoveryBridge = createRecoveryBridge();
    const store = createStoreWith(createBridge(), "unlocked", recoveryBridge);

    const result = await store.getState().viewRecoveryKey("current password");

    expect(recoveryBridge.viewKey).toHaveBeenCalledWith("current password");
    expect(result).toEqual(SETUP_SUCCEEDED);
    expect(store.getState().status).toBe("unlocked");
    expect(store.getState().pendingRecoveryWords).toBeUndefined();
  });

  it("失败不改变保险库状态, 也不重新向主进程取状态", async () => {
    const bridge = createBridge();
    const recoveryBridge = createRecoveryBridge({
      viewKey: () => Promise.resolve(vaultOperationFailed("unexpected-error")),
    });
    const store = createStoreWith(bridge, "unlocked", recoveryBridge);

    const result = await store.getState().viewRecoveryKey();

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(store.getState().status).toBe("unlocked");
    expect(bridge.getStatus).not.toHaveBeenCalled();
  });
});

describe("createVaultStore 凭词恢复", () => {
  it("请求与取消恢复只改变界面流程, 不改变保险库状态", () => {
    const store = createStoreWith(createBridge(), "locked");

    store.getState().requestRestore();
    expect(store.getState().isRestoreRequested).toBe(true);
    store.getState().cancelRestore();

    expect(store.getState().isRestoreRequested).toBe(false);
    expect(store.getState().status).toBe("locked");
  });

  it("校验恢复词成功不改变状态, 失败时原样返回原因", async () => {
    const recoveryBridge = createRecoveryBridge({
      verifyWords: () =>
        Promise.resolve(vaultOperationFailed("recovery-unknown-word", 5)),
    });
    const store = createStoreWith(createBridge(), "locked", recoveryBridge);

    const result = await store.getState().verifyRecoveryWords(WORDS);

    expect(result).toEqual({
      ok: false,
      reason: "recovery-unknown-word",
      wordPosition: 5,
    });
    expect(store.getState().status).toBe("locked");
  });

  it("校验成功时状态保持锁定, 不会误转入 unlocked", async () => {
    const store = createStoreWith(createBridge(), "locked");

    await store.getState().verifyRecoveryWords(WORDS);

    expect(store.getState().status).toBe("locked");
  });
});

describe("createVaultStore 恢复成功与失败", () => {
  it("设置新主密码恢复成功后状态变为 unlocked, 清除恢复请求", async () => {
    const recoveryBridge = createRecoveryBridge();
    const store = createStoreWith(createBridge(), "locked", recoveryBridge);
    store.getState().requestRestore();

    await store.getState().restoreWithMasterPassword(WORDS, "new password");

    expect(recoveryBridge.restoreWithMasterPassword).toHaveBeenCalledWith(
      WORDS,
      "new password",
    );
    expect(store.getState().status).toBe("unlocked");
    expect(store.getState().isRestoreRequested).toBe(false);
    expect(store.getState().pendingRecoveryWords).toBeUndefined();
  });

  it("改用系统保护恢复成功后状态变为 unlocked", async () => {
    const store = createStoreWith(createBridge(), "failed");

    await store.getState().restoreWithoutMasterPassword(WORDS);

    expect(store.getState().status).toBe("unlocked");
  });

  it("恢复遇到意外错误时状态变为 failed 并退出恢复流程", async () => {
    const recoveryBridge = createRecoveryBridge({
      restoreWithoutMasterPassword: () =>
        Promise.resolve(vaultOperationFailed("unexpected-error")),
    });
    const store = createStoreWith(createBridge(), "locked", recoveryBridge);
    store.getState().requestRestore();

    await store.getState().restoreWithoutMasterPassword(WORDS);

    expect(store.getState().status).toBe("failed");
    expect(store.getState().isRestoreRequested).toBe(false);
  });

  it("恢复被拒绝 (词不对) 时状态与恢复请求都不变", async () => {
    const recoveryBridge = createRecoveryBridge({
      restoreWithMasterPassword: () =>
        Promise.resolve(vaultOperationFailed("recovery-key-rejected")),
    });
    const store = createStoreWith(createBridge(), "locked", recoveryBridge);
    store.getState().requestRestore();

    await store.getState().restoreWithMasterPassword(WORDS, "new password");

    expect(store.getState().status).toBe("locked");
    expect(store.getState().isRestoreRequested).toBe(true);
  });
});
