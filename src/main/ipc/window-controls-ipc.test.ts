import { describe, expect, it } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import { createFakeIpcMain } from "../testing/fake-ipc-main";
import {
  SENDER_REJECTION_MESSAGE as REJECTION_MESSAGE,
  createFakeMainWindow,
  createTopFrameEvent,
  type FakeMainWindow,
} from "../testing/fake-main-window";
import { createMainWindowHolder } from "../window/main-window-holder";
import { registerWindowControlsIpc } from "./window-controls-ipc";

/**
 * 全部窗口控制通道.
 */
const WINDOW_CONTROL_CHANNELS = [
  IPC_CHANNELS.windowMinimize,
  IPC_CHANNELS.windowToggleMaximize,
  IPC_CHANNELS.windowClose,
  IPC_CHANNELS.windowIsMaximized,
];

/**
 * 登记了主窗口并注册了窗口控制通道的测试环境.
 */
interface WindowControlsSetup {
  /**
   * 假的主进程 IPC.
   */
  readonly ipcMain: ReturnType<typeof createFakeIpcMain>;
  /**
   * 登记在持有者里的假主窗口.
   */
  readonly mainWindow: FakeMainWindow;
}

/**
 * 登记一个假主窗口并注册窗口控制通道.
 * @param isMaximized 主窗口一开始是否最大化.
 * @returns 假 IPC 与假主窗口.
 */
function setUpWindowControls(isMaximized = false): WindowControlsSetup {
  const mainWindow = createFakeMainWindow(isMaximized);
  const holder = createMainWindowHolder<FakeMainWindow>();
  holder.set(mainWindow);
  const ipcMain = createFakeIpcMain(holder);
  registerWindowControlsIpc(ipcMain, holder);
  return { ipcMain, mainWindow };
}

describe("registerWindowControlsIpc 来自主窗口的调用", () => {
  it("最小化通道最小化主窗口", () => {
    const { ipcMain, mainWindow } = setUpWindowControls();

    ipcMain.invokeWithEvent(
      createTopFrameEvent(mainWindow.webContents),
      IPC_CHANNELS.windowMinimize,
    );

    expect(mainWindow.minimize).toHaveBeenCalledOnce();
  });

  it("切换通道在未最大化时最大化, 已最大化时还原", () => {
    const unmaximized = setUpWindowControls(false);
    const maximized = setUpWindowControls(true);

    unmaximized.ipcMain.invokeWithEvent(
      createTopFrameEvent(unmaximized.mainWindow.webContents),
      IPC_CHANNELS.windowToggleMaximize,
    );
    maximized.ipcMain.invokeWithEvent(
      createTopFrameEvent(maximized.mainWindow.webContents),
      IPC_CHANNELS.windowToggleMaximize,
    );

    expect(unmaximized.mainWindow.maximize).toHaveBeenCalledOnce();
    expect(maximized.mainWindow.unmaximize).toHaveBeenCalledOnce();
  });

  it("关闭通道关闭主窗口", () => {
    const { ipcMain, mainWindow } = setUpWindowControls();

    ipcMain.invokeWithEvent(
      createTopFrameEvent(mainWindow.webContents),
      IPC_CHANNELS.windowClose,
    );

    expect(mainWindow.close).toHaveBeenCalledOnce();
  });

  it("查询通道返回主窗口是否最大化", () => {
    const { ipcMain, mainWindow } = setUpWindowControls(true);

    const result = ipcMain.invokeWithEvent(
      createTopFrameEvent(mainWindow.webContents),
      IPC_CHANNELS.windowIsMaximized,
    );

    expect(result).toBe(true);
  });
});

describe("registerWindowControlsIpc 来源不合法的调用", () => {
  it("来自其它页面的调用被拒绝, 主窗口不受影响", () => {
    const { ipcMain, mainWindow } = setUpWindowControls();
    const foreignEvent = createTopFrameEvent({});

    for (const channel of WINDOW_CONTROL_CHANNELS) {
      expect(() => ipcMain.invokeWithEvent(foreignEvent, channel)).toThrow(
        REJECTION_MESSAGE,
      );
    }
    expect(mainWindow.minimize).not.toHaveBeenCalled();
    expect(mainWindow.maximize).not.toHaveBeenCalled();
    expect(mainWindow.unmaximize).not.toHaveBeenCalled();
    expect(mainWindow.close).not.toHaveBeenCalled();
  });

  it("没有事件信息的调用被拒绝", () => {
    const { ipcMain, mainWindow } = setUpWindowControls();

    for (const channel of WINDOW_CONTROL_CHANNELS) {
      expect(() => ipcMain.invokeWithEvent({}, channel)).toThrow(
        REJECTION_MESSAGE,
      );
    }
    expect(mainWindow.close).not.toHaveBeenCalled();
  });

  it("还没有登记主窗口时全部通道被拒绝", () => {
    const holder = createMainWindowHolder<FakeMainWindow>();
    const ipcMain = createFakeIpcMain(holder);
    registerWindowControlsIpc(ipcMain, holder);

    for (const channel of WINDOW_CONTROL_CHANNELS) {
      expect(() =>
        ipcMain.invokeWithEvent(createTopFrameEvent({}), channel),
      ).toThrow(REJECTION_MESSAGE);
    }
  });
});

describe("registerWindowControlsIpc 底层端口不校验来源", () => {
  it("还没有登记主窗口时通道不操作任何窗口, 也不报错", () => {
    const handlers = new Map<string, (event: unknown) => unknown>();
    registerWindowControlsIpc(
      {
        handle: (channel, handler) => {
          handlers.set(channel, handler);
        },
      },
      createMainWindowHolder<FakeMainWindow>(),
    );

    for (const channel of WINDOW_CONTROL_CHANNELS) {
      expect(handlers.get(channel)?.({})).toBeUndefined();
    }
  });
});
