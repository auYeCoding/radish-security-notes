import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";
import { isAutoLockSettings } from "@shared/preferences/auto-lock-settings";
import { isSupportedLanguage } from "@shared/preferences/language";
import { isThemeSource } from "@shared/preferences/theme-source";

import type { PreferencesService } from "../preferences/preferences-service";

/**
 * 偏好 IPC 依赖的主进程 IPC 接口, Electron 的 `ipcMain` 满足它.
 */
export interface IpcMainPort {
  /**
   * 注册一个可被渲染进程调用的通道.
   * @param channel 通道名.
   * @param handler 处理函数.
   */
  handle: (
    channel: string,
    handler: (event: unknown, ...args: unknown[]) => unknown,
  ) => void;
}

/**
 * 注册偏好相关的 IPC 通道, 参数在进程边界处校验后才交给偏好服务.
 * @param ipcMain 主进程 IPC 接口.
 * @param service 偏好服务.
 */
export function registerPreferencesIpc(
  ipcMain: IpcMainPort,
  service: PreferencesService,
): void {
  ipcMain.handle(IPC_CHANNELS.preferencesGetSnapshot, () =>
    service.getSnapshot(),
  );
  ipcMain.handle(
    IPC_CHANNELS.preferencesSetThemeSource,
    (_event, themeSource) => {
      if (!isThemeSource(themeSource)) {
        throw new Error("无效的主题来源");
      }
      service.setThemeSource(themeSource);
    },
  );
  ipcMain.handle(IPC_CHANNELS.preferencesSetLanguage, (_event, language) => {
    if (!isSupportedLanguage(language)) {
      throw new Error("无效的界面语言");
    }
    return service.setLanguage(language);
  });
  ipcMain.handle(
    IPC_CHANNELS.preferencesSetSidebarCollapsed,
    (_event, isCollapsed) => {
      if (typeof isCollapsed !== "boolean") {
        throw new Error("无效的侧栏折叠状态");
      }
      service.setSidebarCollapsed(isCollapsed);
    },
  );
  ipcMain.handle(IPC_CHANNELS.preferencesSetAutoLock, (_event, settings) => {
    if (!isAutoLockSettings(settings)) {
      throw new Error("无效的自动锁定设置");
    }
    service.setAutoLockSettings(settings);
  });
}
