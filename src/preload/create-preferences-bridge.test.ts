import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";
import { DEFAULT_AUTO_LOCK_SETTINGS } from "@shared/preferences/auto-lock-settings";

import { createPreferencesBridge } from "./create-preferences-bridge";

describe("createPreferencesBridge", () => {
  it("getSnapshot 调用读取快照通道并返回结果", async () => {
    const snapshot = {
      themeSource: "dark",
      language: "zh",
      isSidebarCollapsed: false,
      isPseudoLocalizationEnabled: false,
    };
    const invoke = vi.fn(() => Promise.resolve(snapshot));

    const result = await createPreferencesBridge({ invoke }).getSnapshot();

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.preferencesGetSnapshot);
    expect(result).toBe(snapshot);
  });

  it("setThemeSource 与 setLanguage 调用对应通道并带上参数", async () => {
    const invoke = vi.fn(() => Promise.resolve(undefined));
    const bridge = createPreferencesBridge({ invoke });

    await bridge.setThemeSource("light");
    await bridge.setLanguage("en");

    expect(invoke).toHaveBeenNthCalledWith(
      1,
      IPC_CHANNELS.preferencesSetThemeSource,
      "light",
    );
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      IPC_CHANNELS.preferencesSetLanguage,
      "en",
    );
  });

  it("setSidebarCollapsed 调用对应通道并带上折叠状态", async () => {
    const invoke = vi.fn(() => Promise.resolve(undefined));
    const bridge = createPreferencesBridge({ invoke });

    await bridge.setSidebarCollapsed(true);

    expect(invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.preferencesSetSidebarCollapsed,
      true,
    );
  });
});

describe("createPreferencesBridge: 自动锁定设置", () => {
  it("setAutoLock 调用对应通道并带上完整设置", async () => {
    const invoke = vi.fn(() => Promise.resolve(undefined));
    const bridge = createPreferencesBridge({ invoke });
    const settings = {
      ...DEFAULT_AUTO_LOCK_SETTINGS,
      isSleepLockEnabled: false,
    };

    await bridge.setAutoLock(settings);

    expect(invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.preferencesSetAutoLock,
      settings,
    );
  });
});
