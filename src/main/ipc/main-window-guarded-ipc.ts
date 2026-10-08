import type { MainWindowHolder } from "../window/main-window-holder";
import {
  requireMainWindowSender,
  type MainWindowSenderTarget,
} from "./main-window-sender-guard";
import type { IpcMainPort } from "./preferences-ipc";

/**
 * 来源校验只读取主窗口, 不登记: 主窗口持有者里的读取部分.
 */
export type MainWindowReader = Pick<
  MainWindowHolder<MainWindowSenderTarget>,
  "get"
>;

/**
 * 包装主进程 IPC 接口: 经它注册的每个通道, 处理函数执行前先校验调用来自主窗口的顶层页面,
 * 其它窗口, 子帧, 没有登记主窗口时一律拒绝, 处理函数不被调用. 主窗口在每次调用时才读取,
 * 所以通道可以早于主窗口创建注册.
 * @param ipcMain 被包装的主进程 IPC 接口.
 * @param mainWindowReader 主窗口的读取入口.
 * @returns 带来源校验的主进程 IPC 接口.
 */
export function guardIpcMainByMainWindow(
  ipcMain: IpcMainPort,
  mainWindowReader: MainWindowReader,
): IpcMainPort {
  return {
    handle: (channel, handler) => {
      ipcMain.handle(channel, (event, ...args) => {
        requireMainWindowSender(event, mainWindowReader.get());
        return handler(event, ...args);
      });
    },
  };
}
