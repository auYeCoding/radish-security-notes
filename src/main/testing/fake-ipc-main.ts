import { guardIpcMainByMainWindow } from "../ipc/main-window-guarded-ipc";
import type { IpcMainPort } from "../ipc/preferences-ipc";
import {
  createMainWindowHolder,
  type MainWindowHolder,
} from "../window/main-window-holder";
import {
  createFakeMainWindow,
  createTopFrameEvent,
  type FakeMainWindow,
} from "./fake-main-window";

/**
 * 假的主进程 IPC, 记下注册的处理函数以便直接调用. 它和生产装配一样经过来源校验: `invoke`
 * 模拟来自主窗口顶层页面的合法调用, `invokeWithEvent` 模拟任意来源.
 */
export interface FakeIpcMain extends IpcMainPort {
  /**
   * 以主窗口顶层页面的合法来源调用某个通道上注册的处理函数.
   * @param channel 通道名.
   * @param args 传给处理函数的参数.
   * @returns 处理函数的返回值.
   */
  invoke: (channel: string, ...args: unknown[]) => unknown;
  /**
   * 以指定的事件调用某个通道上注册的处理函数, 用来模拟不同的调用来源.
   * @param event 传给处理函数的事件.
   * @param channel 通道名.
   * @param args 传给处理函数的参数.
   * @returns 处理函数的返回值.
   */
  invokeWithEvent: (
    event: unknown,
    channel: string,
    ...args: unknown[]
  ) => unknown;
}

/**
 * 假 IPC 校验来源时读取的主窗口入口.
 */
type FakeMainWindowReader = Pick<MainWindowHolder<FakeMainWindow>, "get">;

/**
 * 创建一个已登记假主窗口的持有者.
 * @returns 主窗口持有者.
 */
function createRegisteredHolder(): MainWindowHolder<FakeMainWindow> {
  const holder = createMainWindowHolder<FakeMainWindow>();
  holder.set(createFakeMainWindow());
  return holder;
}

/**
 * 创建一次来自主窗口顶层页面的合法调用事件.
 * @param reader 主窗口的读取入口.
 * @returns 合法来源的事件, 没有登记主窗口时为空对象.
 */
function createLegitimateEvent(reader: FakeMainWindowReader): unknown {
  const mainWindow = reader.get();
  return mainWindow === undefined
    ? {}
    : createTopFrameEvent(mainWindow.webContents);
}

/**
 * 创建假的主进程 IPC.
 * @param mainWindowReader 来源校验读取的主窗口入口, 不给时自带一个已登记的假主窗口.
 * @returns 假 IPC.
 */
export function createFakeIpcMain(
  mainWindowReader: FakeMainWindowReader = createRegisteredHolder(),
): FakeIpcMain {
  const handlers = new Map<
    string,
    (event: unknown, ...args: unknown[]) => unknown
  >();
  const guardedIpcMain = guardIpcMainByMainWindow(
    {
      handle: (channel, handler) => {
        handlers.set(channel, handler);
      },
    },
    mainWindowReader,
  );
  return {
    handle: guardedIpcMain.handle,
    invoke: (channel, ...args) =>
      handlers.get(channel)?.(createLegitimateEvent(mainWindowReader), ...args),
    invokeWithEvent: (event, channel, ...args) =>
      handlers.get(channel)?.(event, ...args),
  };
}
