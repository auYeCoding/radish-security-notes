import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

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
