import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";
import type { PreferencesBridge } from "@shared/preferences/preferences-bridge";
import type { PreferencesSnapshot } from "@shared/preferences/preferences-snapshot";

/**
 * 偏好桥依赖的渲染进程 IPC 接口, Electron 的 `ipcRenderer` 满足它.
 */
export interface IpcRendererPort {
  /**
   * 调用主进程注册的通道并等待结果.
   * @param channel 通道名.
   * @param args 传给主进程的参数.
   * @returns 主进程处理函数的返回值.
   */
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
}

/**
 * 创建偏好桥, 把每个方法映射到对应的 IPC 通道.
 * @param ipcRenderer 渲染进程 IPC 接口.
 * @returns 偏好桥.
 */
export function createPreferencesBridge(
  ipcRenderer: IpcRendererPort,
): PreferencesBridge {
  return {
    getSnapshot: async () => {
      const snapshot = await ipcRenderer.invoke(
        IPC_CHANNELS.preferencesGetSnapshot,
      );
      return snapshot as PreferencesSnapshot;
    },
    setThemeSource: async (themeSource) => {
      await ipcRenderer.invoke(
        IPC_CHANNELS.preferencesSetThemeSource,
        themeSource,
      );
    },
    setLanguage: async (language) => {
      await ipcRenderer.invoke(IPC_CHANNELS.preferencesSetLanguage, language);
    },
    setSidebarCollapsed: async (isCollapsed) => {
      await ipcRenderer.invoke(
        IPC_CHANNELS.preferencesSetSidebarCollapsed,
        isCollapsed,
      );
    },
    setAutoLock: async (settings) => {
      await ipcRenderer.invoke(IPC_CHANNELS.preferencesSetAutoLock, settings);
    },
  };
}
