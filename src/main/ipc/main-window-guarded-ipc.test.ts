import { describe, expect, it, vi } from "vitest";

import {
  SENDER_REJECTION_MESSAGE,
  createFakeMainWindow,
  createSubFrameEvent,
  createTopFrameEvent,
  type FakeMainWindow,
} from "../testing/fake-main-window";
import {
  createMainWindowHolder,
  type MainWindowHolder,
} from "../window/main-window-holder";
import { guardIpcMainByMainWindow } from "./main-window-guarded-ipc";
import type { IpcMainPort } from "./preferences-ipc";

/**
 * 测试用的通道名.
 */
const CHANNEL = "test:channel";

/**
 * 底层端口收到的处理函数类型.
 */
type RegisteredHandler = (event: unknown, ...args: unknown[]) => unknown;

/**
 * 包装了一个底层端口的测试环境.
 */
interface GuardSetup {
  /**
   * 底层端口上实际注册的处理函数, 即被包装过的那一个.
   */
  readonly registered: RegisteredHandler;
  /**
   * 经包装注册的原处理函数的间谍.
   */
  readonly handler: ReturnType<typeof vi.fn>;
  /**
   * 登记在持有者里的主窗口.
   */
  readonly mainWindow: FakeMainWindow;
  /**
   * 主窗口持有者.
   */
  readonly holder: MainWindowHolder<FakeMainWindow>;
}

/**
 * 登记一个主窗口, 在最小的底层端口上包装并注册一个处理函数.
 * @param isMainWindowRegistered 是否登记主窗口.
 * @returns 测试环境.
 */
function setUpGuard(isMainWindowRegistered = true): GuardSetup {
  const mainWindow = createFakeMainWindow();
  const holder = createMainWindowHolder<FakeMainWindow>();
  if (isMainWindowRegistered) {
    holder.set(mainWindow);
  }
  const registrations = new Map<string, RegisteredHandler>();
  const basePort: IpcMainPort = {
    handle: (channel, registeredHandler) => {
      registrations.set(channel, registeredHandler);
    },
  };
  const handler = vi.fn((_event: unknown, ...args: unknown[]) => args);
  guardIpcMainByMainWindow(basePort, holder).handle(CHANNEL, handler);
  const registered = registrations.get(CHANNEL);
  if (registered === undefined) {
    throw new Error("底层端口没有收到注册");
  }
  return { registered, handler, mainWindow, holder };
}

describe("guardIpcMainByMainWindow 来自主窗口顶层页面的调用", () => {
  it("放行并把事件与参数原样交给处理函数, 返回值原样透传", () => {
    const { registered, handler, mainWindow } = setUpGuard();
    const event = createTopFrameEvent(mainWindow.webContents);

    const result = registered(event, "a", 2);

    expect(handler).toHaveBeenCalledExactlyOnceWith(event, "a", 2);
    expect(result).toEqual(["a", 2]);
  });

  it("异步处理函数的结果原样透传", async () => {
    const mainWindow = createFakeMainWindow();
    const holder = createMainWindowHolder<FakeMainWindow>();
    holder.set(mainWindow);
    let registered: RegisteredHandler | undefined;
    guardIpcMainByMainWindow(
      {
        handle: (_channel, registeredHandler) => {
          registered = registeredHandler;
        },
      },
      holder,
    ).handle(CHANNEL, () => Promise.resolve("done"));

    const result = registered?.(createTopFrameEvent(mainWindow.webContents));

    await expect(result).resolves.toBe("done");
  });

  it("处理函数自己抛的错误原样透传", () => {
    const { registered, handler, mainWindow } = setUpGuard();
    handler.mockImplementation(() => {
      throw new Error("业务错误");
    });

    expect(() =>
      registered(createTopFrameEvent(mainWindow.webContents)),
    ).toThrow("业务错误");
  });

  it("主窗口换成新窗口后以新窗口为准", () => {
    const { registered, handler, mainWindow, holder } = setUpGuard();
    const newWindow = createFakeMainWindow();
    holder.set(newWindow);

    expect(() =>
      registered(createTopFrameEvent(mainWindow.webContents)),
    ).toThrow(SENDER_REJECTION_MESSAGE);
    registered(createTopFrameEvent(newWindow.webContents));

    expect(handler).toHaveBeenCalledOnce();
  });
});

describe("guardIpcMainByMainWindow 来源不合法的调用", () => {
  it("来自其它窗口的页面时被拒绝, 处理函数不被调用", () => {
    const { registered, handler } = setUpGuard();

    expect(() =>
      registered(createTopFrameEvent(createFakeMainWindow().webContents)),
    ).toThrow(SENDER_REJECTION_MESSAGE);
    expect(handler).not.toHaveBeenCalled();
  });

  it("来自主窗口的子帧时被拒绝, 处理函数不被调用", () => {
    const { registered, handler, mainWindow } = setUpGuard();

    expect(() =>
      registered(createSubFrameEvent(mainWindow.webContents)),
    ).toThrow(SENDER_REJECTION_MESSAGE);
    expect(handler).not.toHaveBeenCalled();
  });

  it("没有发送帧时被拒绝, 处理函数不被调用", () => {
    const { registered, handler, mainWindow } = setUpGuard();

    for (const senderFrame of [undefined, null]) {
      const event = { sender: mainWindow.webContents, senderFrame };
      expect(() => registered(event)).toThrow(SENDER_REJECTION_MESSAGE);
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it("事件不是对象时被拒绝, 处理函数不被调用", () => {
    const { registered, handler } = setUpGuard();

    for (const event of [undefined, null, 1, "event"]) {
      expect(() => registered(event)).toThrow(SENDER_REJECTION_MESSAGE);
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it("还没有登记主窗口时被拒绝, 处理函数不被调用", () => {
    const { registered, handler, mainWindow } = setUpGuard(false);

    expect(() =>
      registered(createTopFrameEvent(mainWindow.webContents)),
    ).toThrow(SENDER_REJECTION_MESSAGE);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("guardIpcMainByMainWindow 拒绝信息", () => {
  it("固定不变, 不含通道名与参数内容", () => {
    const { registered } = setUpGuard();
    const secretArgument = "secret-master-password";
    const messages = [
      createTopFrameEvent(createFakeMainWindow().webContents),
      createSubFrameEvent({}),
      undefined,
    ].map((event) => {
      try {
        registered(event, secretArgument);
      } catch (error) {
        return error instanceof Error ? error.message : "";
      }
      return "";
    });

    expect(messages).toEqual(Array(3).fill(SENDER_REJECTION_MESSAGE));
    expect(SENDER_REJECTION_MESSAGE).not.toContain(CHANNEL);
    expect(SENDER_REJECTION_MESSAGE).not.toContain(secretArgument);
  });
});
