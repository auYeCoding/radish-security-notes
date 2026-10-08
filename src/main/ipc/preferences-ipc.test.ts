import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";
import { DEFAULT_AUTO_LOCK_SETTINGS } from "@shared/preferences/auto-lock-settings";

import type { PreferencesService } from "../preferences/preferences-service";
import { registerPreferencesIpc, type IpcMainPort } from "./preferences-ipc";

/**
 * 假的主进程 IPC, 记下注册的处理函数以便直接调用.
 */
interface FakeIpcMain extends IpcMainPort {
  /**
   * 调用某个通道上注册的处理函数.
   * @param channel 通道名.
   * @param args 传给处理函数的参数.
   * @returns 处理函数的返回值.
   */
  invoke: (channel: string, ...args: unknown[]) => unknown;
}

/**
 * 创建假的主进程 IPC.
 * @returns 假 IPC.
 */
function createFakeIpcMain(): FakeIpcMain {
  const handlers = new Map<
    string,
    (event: unknown, ...args: unknown[]) => unknown
  >();
  return {
    handle: (channel, handler) => {
      handlers.set(channel, handler);
    },
    invoke: (channel, ...args) => handlers.get(channel)?.({}, ...args),
  };
}

/**
 * 创建带间谍方法的假偏好服务.
 * @returns 假服务.
 */
function createFakeService(): PreferencesService {
  return {
    getSnapshot: vi.fn(() => ({
      themeSource: "system",
      language: "en",
      isSidebarCollapsed: false,
      autoLock: DEFAULT_AUTO_LOCK_SETTINGS,
      isPseudoLocalizationEnabled: false,
    })),
    setThemeSource: vi.fn(),
    setLanguage: vi.fn(() => Promise.resolve()),
    setSidebarCollapsed: vi.fn(),
    setAutoLockSettings: vi.fn(),
    onLanguageChanged: vi.fn(),
  } as unknown as PreferencesService;
}

describe("registerPreferencesIpc", () => {
  it("读取快照通道返回偏好快照", () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerPreferencesIpc(ipcMain, service);

    expect(ipcMain.invoke(IPC_CHANNELS.preferencesGetSnapshot)).toEqual(
      service.getSnapshot(),
    );
  });

  it("合法的主题来源交给服务", () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerPreferencesIpc(ipcMain, service);

    ipcMain.invoke(IPC_CHANNELS.preferencesSetThemeSource, "dark");

    expect(service.setThemeSource).toHaveBeenCalledWith("dark");
  });

  it("不合法的主题来源被拒绝且不触达服务", () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerPreferencesIpc(ipcMain, service);

    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.preferencesSetThemeSource, "sepia"),
    ).toThrow("无效的主题来源");
    expect(service.setThemeSource).not.toHaveBeenCalled();
  });

  it("合法的语言交给服务, 不合法的被拒绝", () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerPreferencesIpc(ipcMain, service);

    ipcMain.invoke(IPC_CHANNELS.preferencesSetLanguage, "zh");

    expect(service.setLanguage).toHaveBeenCalledWith("zh");
    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.preferencesSetLanguage, "pseudo"),
    ).toThrow("无效的界面语言");
  });

  it("布尔的侧栏折叠状态交给服务, 非布尔值被拒绝且不触达服务", () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerPreferencesIpc(ipcMain, service);

    ipcMain.invoke(IPC_CHANNELS.preferencesSetSidebarCollapsed, true);
    ipcMain.invoke(IPC_CHANNELS.preferencesSetSidebarCollapsed, false);

    expect(service.setSidebarCollapsed).toHaveBeenNthCalledWith(1, true);
    expect(service.setSidebarCollapsed).toHaveBeenNthCalledWith(2, false);
    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.preferencesSetSidebarCollapsed, "true"),
    ).toThrow("无效的侧栏折叠状态");
    expect(service.setSidebarCollapsed).toHaveBeenCalledTimes(2);
  });
});

describe("registerPreferencesIpc: 自动锁定设置", () => {
  it("完整合法的设置交给服务", () => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerPreferencesIpc(ipcMain, service);
    const settings = { ...DEFAULT_AUTO_LOCK_SETTINGS, idleMinutes: 5 };

    ipcMain.invoke(IPC_CHANNELS.preferencesSetAutoLock, settings);

    expect(service.setAutoLockSettings).toHaveBeenCalledWith(settings);
  });

  it.each([
    ["字符串", "on"],
    ["缺少字段", { isIdleLockEnabled: true }],
    ["时长不在档位里", { ...DEFAULT_AUTO_LOCK_SETTINGS, idleMinutes: 7 }],
    [
      "开关不是布尔值",
      { ...DEFAULT_AUTO_LOCK_SETTINGS, isScreenLockEnabled: "yes" },
    ],
  ])("%s被拒绝且不触达服务", (_name, settings) => {
    const ipcMain = createFakeIpcMain();
    const service = createFakeService();
    registerPreferencesIpc(ipcMain, service);

    expect(() =>
      ipcMain.invoke(IPC_CHANNELS.preferencesSetAutoLock, settings),
    ).toThrow("无效的自动锁定设置");
    expect(service.setAutoLockSettings).not.toHaveBeenCalled();
  });
});
