import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createVaultEventsBridge } from "./create-vault-events-bridge";

/**
 * 按通道名记下的订阅处理函数.
 */
type SubscriptionTable = Map<
  string,
  (event: unknown, ...args: unknown[]) => void
>;

/**
 * 假的渲染进程 IPC 与它记下的订阅.
 */
interface FakePort {
  /**
   * 交给被测函数的 IPC 接口.
   */
  readonly ipcRenderer: Parameters<typeof createVaultEventsBridge>[0];
  /**
   * 按通道名记下的订阅表.
   */
  readonly subscriptions: SubscriptionTable;
}

/**
 * 创建会记下订阅的假渲染进程 IPC.
 * @returns 假 IPC 与按通道名记下的订阅表.
 */
function createFakePort(): FakePort {
  const subscriptions: SubscriptionTable = new Map();
  return {
    subscriptions,
    ipcRenderer: {
      on: (channel, listener) => {
        subscriptions.set(channel, listener);
      },
      removeListener: (channel, listener) => {
        if (subscriptions.get(channel) === listener) {
          subscriptions.delete(channel);
        }
      },
    },
  };
}

describe("createVaultEventsBridge", () => {
  it("订阅自动锁定通道, 推送的合法原因交给监听函数", () => {
    const { ipcRenderer, subscriptions } = createFakePort();
    const listener = vi.fn();
    createVaultEventsBridge(ipcRenderer).onAutoLocked(listener);
    const push = subscriptions.get(IPC_CHANNELS.vaultAutoLocked);

    push?.({}, "idle");
    push?.({}, "screen-lock");
    push?.({}, "sleep");

    expect(listener.mock.calls).toEqual([["idle"], ["screen-lock"], ["sleep"]]);
  });

  it("推送的不是登记过的原因时忽略", () => {
    const { ipcRenderer, subscriptions } = createFakePort();
    const listener = vi.fn();
    createVaultEventsBridge(ipcRenderer).onAutoLocked(listener);
    const push = subscriptions.get(IPC_CHANNELS.vaultAutoLocked);

    push?.({}, "manual");
    push?.({}, undefined);
    push?.({}, 1);

    expect(listener).not.toHaveBeenCalled();
  });

  it("返回的函数取消订阅, 之后不再有处理函数", () => {
    const { ipcRenderer, subscriptions } = createFakePort();
    const unsubscribe = createVaultEventsBridge(ipcRenderer).onAutoLocked(
      vi.fn(),
    );

    unsubscribe();

    expect(subscriptions.has(IPC_CHANNELS.vaultAutoLocked)).toBe(false);
  });
});
