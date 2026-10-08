import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_AUTO_LOCK_SETTINGS,
  type AutoLockSettings,
} from "@shared/preferences/auto-lock-settings";

import { createPreferencesTestEnvironment } from "@renderer/testing/preferences-test-environment";

describe("createPreferencesStore", () => {
  it("初始状态来自偏好快照", async () => {
    const { store } = await createPreferencesTestEnvironment();

    expect(store.getState().themeSource).toBe("system");
    expect(store.getState().language).toBe("zh");
  });

  it("切换主题来源时先经主进程保存, 再更新状态", async () => {
    const { store, bridge } = await createPreferencesTestEnvironment();

    await store.getState().setThemeSource("dark");

    expect(bridge.setThemeSource).toHaveBeenCalledWith("dark");
    expect(store.getState().themeSource).toBe("dark");
  });

  it("切换语言时保存偏好并切换渲染进程的 i18n 实例", async () => {
    const { store, bridge, i18n } = await createPreferencesTestEnvironment();

    await store.getState().setLanguage("en");

    expect(bridge.setLanguage).toHaveBeenCalledWith("en");
    expect(i18n.t("app.title")).toBe("Security Notes");
    expect(store.getState().language).toBe("en");
  });

  it("主进程保存失败时状态与语言都保持不变", async () => {
    const { store, i18n } = await createPreferencesTestEnvironment({
      setLanguage: vi.fn(() => Promise.reject(new Error("保存失败"))),
    });

    await expect(store.getState().setLanguage("en")).rejects.toThrow(
      "保存失败",
    );

    expect(store.getState().language).toBe("zh");
    expect(i18n.t("app.title")).toBe("安全笔记");
  });
});

describe("createPreferencesStore: 侧栏折叠状态", () => {
  it("初始快照里侧栏是展开的", async () => {
    const { store } = await createPreferencesTestEnvironment();

    expect(store.getState().isSidebarCollapsed).toBe(false);
  });

  it("折叠与展开侧栏时先经主进程保存, 再更新状态", async () => {
    const { store, bridge } = await createPreferencesTestEnvironment();

    await store.getState().setSidebarCollapsed(true);
    expect(bridge.setSidebarCollapsed).toHaveBeenLastCalledWith(true);
    expect(store.getState().isSidebarCollapsed).toBe(true);

    await store.getState().setSidebarCollapsed(false);
    expect(bridge.setSidebarCollapsed).toHaveBeenLastCalledWith(false);
    expect(store.getState().isSidebarCollapsed).toBe(false);
  });

  it("主进程保存折叠状态失败时状态保持不变", async () => {
    const { store } = await createPreferencesTestEnvironment({
      setSidebarCollapsed: vi.fn(() => Promise.reject(new Error("保存失败"))),
    });

    await expect(store.getState().setSidebarCollapsed(true)).rejects.toThrow(
      "保存失败",
    );

    expect(store.getState().isSidebarCollapsed).toBe(false);
  });
});

describe("createPreferencesStore: 自动锁定设置", () => {
  const customSettings: AutoLockSettings = {
    isIdleLockEnabled: false,
    idleMinutes: 30,
    isScreenLockEnabled: false,
    isSleepLockEnabled: true,
  };

  it("初始状态来自偏好快照里的自动锁定设置", async () => {
    const { store } = await createPreferencesTestEnvironment();

    expect(store.getState().autoLock).toEqual(DEFAULT_AUTO_LOCK_SETTINGS);
  });

  it("修改设置时先经主进程保存, 再更新状态", async () => {
    const { store, bridge } = await createPreferencesTestEnvironment();

    await store.getState().setAutoLock(customSettings);

    expect(bridge.setAutoLock).toHaveBeenCalledWith(customSettings);
    expect(store.getState().autoLock).toEqual(customSettings);
  });

  it("主进程保存失败时状态保持不变", async () => {
    const { store } = await createPreferencesTestEnvironment({
      setAutoLock: vi.fn(() => Promise.reject(new Error("保存失败"))),
    });

    await expect(store.getState().setAutoLock(customSettings)).rejects.toThrow(
      "保存失败",
    );

    expect(store.getState().autoLock).toEqual(DEFAULT_AUTO_LOCK_SETTINGS);
  });
});
