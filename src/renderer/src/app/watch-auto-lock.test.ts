import { describe, expect, it } from "vitest";

import type { AutoLockReason } from "@shared/vault/auto-lock-reason";
import type { VaultEventsBridge } from "@shared/vault/vault-events-bridge";
import { createVaultTestEnvironment } from "@renderer/testing/vault-test-environment";

import { watchAutoLock } from "./watch-auto-lock";

/**
 * 假的保险库事件桥: 记下监听函数, 测试里手动推送.
 */
interface FakeEvents {
  /**
   * 交给被测函数的事件桥.
   */
  readonly bridge: VaultEventsBridge;
  /**
   * 模拟主进程推送一次自动锁定.
   */
  readonly push: (reason: AutoLockReason) => void;
  /**
   * 当前订阅着的监听函数数量.
   */
  readonly listenerCount: () => number;
}

/**
 * 创建假的保险库事件桥.
 * @returns 事件桥与推送函数.
 */
function createFakeEvents(): FakeEvents {
  const listeners = new Set<(reason: AutoLockReason) => void>();
  return {
    bridge: {
      onAutoLocked: (listener) => {
        listeners.add(listener);
        return () => void listeners.delete(listener);
      },
    },
    push: (reason) => listeners.forEach((listener) => listener(reason)),
    listenerCount: () => listeners.size,
  };
}

describe("watchAutoLock", () => {
  it("主进程推送自动锁定后, 已解锁的保险库 store 变为已锁定并记下原因", async () => {
    const { vaultStore } = await createVaultTestEnvironment({
      status: "unlocked",
    });
    const events = createFakeEvents();
    watchAutoLock(vaultStore, events.bridge);

    events.push("idle");

    expect(vaultStore.getState().status).toBe("locked");
    expect(vaultStore.getState().lockReason).toBe("idle");
  });

  it("每次推送都以最新的状态判断: 重新解锁后再被自动锁定也生效", async () => {
    const { vaultStore } = await createVaultTestEnvironment({
      status: "unlocked",
    });
    const events = createFakeEvents();
    watchAutoLock(vaultStore, events.bridge);
    events.push("idle");
    await vaultStore.getState().unlock("a long password");

    events.push("sleep");

    expect(vaultStore.getState().status).toBe("locked");
    expect(vaultStore.getState().lockReason).toBe("sleep");
  });

  it("返回的函数取消订阅, 之后的推送不再生效", async () => {
    const { vaultStore } = await createVaultTestEnvironment({
      status: "unlocked",
    });
    const events = createFakeEvents();
    const unsubscribe = watchAutoLock(vaultStore, events.bridge);

    unsubscribe();
    events.push("idle");

    expect(events.listenerCount()).toBe(0);
    expect(vaultStore.getState().status).toBe("unlocked");
  });
});
