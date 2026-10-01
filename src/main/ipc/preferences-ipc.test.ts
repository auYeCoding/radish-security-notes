import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

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
      isPseudoLocalizationEnabled: false,
    })),
    setThemeSource: vi.fn(),
    setLanguage: vi.fn(() => Promise.resolve()),
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
});
