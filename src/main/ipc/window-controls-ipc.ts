import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { MainWindowHolder } from "../window/main-window-holder";
import {
  closeWindow,
  isWindowMaximized,
  minimizeWindow,
  toggleWindowMaximize,
  type ControllableWindow,
} from "../window/window-controls";
import type { IpcMainPort } from "./preferences-ipc";

/**
 * 注册窗口控制的 IPC 通道: 最小化, 切换最大化与还原, 关闭, 查询是否最大化. 通道都不带参数, 只
 * 操作主窗口; 调用来源由传入的端口统一校验, 这里不再校验.
 * @param ipcMain 带来源校验的主进程 IPC 接口.
 * @param holder 主窗口持有者.
 */
export function registerWindowControlsIpc<
  WindowType extends ControllableWindow,
>(ipcMain: IpcMainPort, holder: MainWindowHolder<WindowType>): void {
  const handle = (
    channel: string,
    action: (window: WindowType) => unknown,
  ): void => {
    ipcMain.handle(channel, () => {
      const mainWindow = holder.get();
      return mainWindow === undefined ? undefined : action(mainWindow);
    });
  };
  handle(IPC_CHANNELS.windowMinimize, minimizeWindow);
  handle(IPC_CHANNELS.windowToggleMaximize, toggleWindowMaximize);
  handle(IPC_CHANNELS.windowClose, closeWindow);
  handle(IPC_CHANNELS.windowIsMaximized, isWindowMaximized);
}
