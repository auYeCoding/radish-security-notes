import { describe, expect, it, vi } from "vitest";

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
