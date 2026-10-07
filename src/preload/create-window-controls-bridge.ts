import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";
import type { WindowControlsBridge } from "@shared/window/window-controls-bridge";

import type { IpcRendererPort } from "./create-preferences-bridge";

/**
 * 窗口控制桥依赖的渲染进程 IPC 接口, 在调用通道之外还能订阅主进程的推送, Electron 的
 * `ipcRenderer` 满足它.
 */
export interface IpcRendererSubscribePort extends IpcRendererPort {
  /**
   * 订阅主进程推送到某个通道的消息.
   * @param channel 通道名.
   * @param listener 收到消息时的处理函数, 第二个参数起是主进程发送的内容.
   */
  on: (
    channel: string,
    listener: (event: unknown, ...args: unknown[]) => void,
  ) => void;
  /**
   * 取消订阅.
   * @param channel 通道名.
   * @param listener 订阅时传入的同一个处理函数.
   */
  removeListener: (
    channel: string,
    listener: (event: unknown, ...args: unknown[]) => void,
  ) => void;
}

/**
 * 创建窗口控制桥, 把每个方法映射到对应的 IPC 通道, 最大化状态的变化来自主进程的推送.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @returns 窗口控制桥.
 */
export function createWindowControlsBridge(
  ipcRenderer: IpcRendererSubscribePort,
): WindowControlsBridge {
  return {
    minimize: async () => {
      await ipcRenderer.invoke(IPC_CHANNELS.windowMinimize);
    },
    toggleMaximize: async () => {
      await ipcRenderer.invoke(IPC_CHANNELS.windowToggleMaximize);
    },
    close: async () => {
      await ipcRenderer.invoke(IPC_CHANNELS.windowClose);
    },
    isMaximized: async () =>
      (await ipcRenderer.invoke(IPC_CHANNELS.windowIsMaximized)) === true,
    onMaximizedChange: (listener) => {
      const handleMessage = (_event: unknown, isMaximized: unknown): void =>
        listener(isMaximized === true);
      ipcRenderer.on(IPC_CHANNELS.windowMaximizedChanged, handleMessage);
      return () =>
        ipcRenderer.removeListener(
          IPC_CHANNELS.windowMaximizedChanged,
          handleMessage,
        );
    },
  };
}
