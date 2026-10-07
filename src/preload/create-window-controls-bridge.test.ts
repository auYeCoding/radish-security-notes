import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import {
  createWindowControlsBridge,
  type IpcRendererSubscribePort,
} from "./create-window-controls-bridge";

/**
 * 假的渲染进程 IPC 与它记下的订阅.
 */
interface FakeSubscribePort {
  /**
   * 传给被测函数的 IPC 接口.
   */
  readonly ipcRenderer: IpcRendererSubscribePort;
  /**
   * 调用通道的间谍.
   */
  readonly invoke: ReturnType<typeof vi.fn>;
  /**
   * 按通道名记下的订阅处理函数.
   */
  readonly subscriptions: Map<
    string,
    (event: unknown, ...args: unknown[]) => void
  >;
}

/**
 * 创建会记下订阅的假渲染进程 IPC.
 * @param reply 调用通道时主进程的回复.
 * @returns 假 IPC, 调用间谍与订阅表.
 */
function createFakeSubscribePort(
  reply: unknown = undefined,
): FakeSubscribePort {
  const subscriptions = new Map<
    string,
    (event: unknown, ...args: unknown[]) => void
  >();
  const invoke = vi.fn(() => Promise.resolve(reply));
  const ipcRenderer: IpcRendererSubscribePort = {
    invoke,
    on: (channel, listener) => {
      subscriptions.set(channel, listener);
    },
    removeListener: (channel, listener) => {
      if (subscriptions.get(channel) === listener) {
        subscriptions.delete(channel);
      }
    },
  };
  return { ipcRenderer, invoke, subscriptions };
}

describe("createWindowControlsBridge 调用通道", () => {
  it("minimize, toggleMaximize, close 各调用对应的通道且不带参数", async () => {
    const { ipcRenderer, invoke } = createFakeSubscribePort();
    const bridge = createWindowControlsBridge(ipcRenderer);

    await bridge.minimize();
    await bridge.toggleMaximize();
    await bridge.close();

    expect(invoke.mock.calls).toEqual([
      [IPC_CHANNELS.windowMinimize],
      [IPC_CHANNELS.windowToggleMaximize],
      [IPC_CHANNELS.windowClose],
    ]);
  });

  it("isMaximized 调用查询通道, 只有主进程返回 true 才兑现 true", async () => {
    for (const reply of [true, false, undefined, null, "true", 1]) {
      const { ipcRenderer, invoke } = createFakeSubscribePort(reply);

      const result =
        await createWindowControlsBridge(ipcRenderer).isMaximized();

      expect(invoke).toHaveBeenCalledExactlyOnceWith(
        IPC_CHANNELS.windowIsMaximized,
      );
      expect(result).toBe(reply === true);
    }
  });
});

describe("createWindowControlsBridge 订阅最大化状态", () => {
  it("主进程推送时把布尔值交给监听函数", () => {
    const { ipcRenderer, subscriptions } = createFakeSubscribePort();
    const listener = vi.fn();
    createWindowControlsBridge(ipcRenderer).onMaximizedChange(listener);
    const push = subscriptions.get(IPC_CHANNELS.windowMaximizedChanged);

    push?.({}, true);
    push?.({}, false);
    push?.({}, "true");

    expect(listener.mock.calls).toEqual([[true], [false], [false]]);
  });

  it("返回的函数取消订阅, 之后不再有处理函数", () => {
    const { ipcRenderer, subscriptions } = createFakeSubscribePort();
    const unsubscribe = createWindowControlsBridge(
      ipcRenderer,
    ).onMaximizedChange(vi.fn());

    unsubscribe();

    expect(subscriptions.has(IPC_CHANNELS.windowMaximizedChanged)).toBe(false);
  });
});
