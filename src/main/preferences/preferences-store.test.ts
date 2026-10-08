import { describe, expect, it } from "vitest";

import {
  DEFAULT_AUTO_LOCK_SETTINGS,
  type AutoLockSettings,
} from "@shared/preferences/auto-lock-settings";

import { createInMemoryKeyValueBackend } from "../testing/in-memory-key-value-backend";
import { PreferencesStore } from "./preferences-store";

describe("PreferencesStore", () => {
  it("没有保存过时主题来源取默认值 system", () => {
    const store = new PreferencesStore(createInMemoryKeyValueBackend());

    expect(store.getThemeSource()).toBe("system");
  });

  it("保存主题来源后能读回", () => {
    const store = new PreferencesStore(createInMemoryKeyValueBackend());

    store.setThemeSource("dark");

    expect(store.getThemeSource()).toBe("dark");
  });

  it("存储里的主题来源不合法时回退到默认值", () => {
    const store = new PreferencesStore(
      createInMemoryKeyValueBackend({ themeSource: "sepia" }),
    );

    expect(store.getThemeSource()).toBe("system");
  });

  it("没有选择过语言时跟随系统语言", () => {
    const store = new PreferencesStore(createInMemoryKeyValueBackend());

    expect(store.getLanguage("zh-CN")).toBe("zh");
    expect(store.getLanguage("en-US")).toBe("en");
    expect(store.getLanguage("fr-FR")).toBe("en");
  });

  it("用户选择过的语言优先于系统语言", () => {
    const store = new PreferencesStore(createInMemoryKeyValueBackend());

    store.setLanguage("en");

    expect(store.getLanguage("zh-CN")).toBe("en");
  });

  it("存储里的语言不合法时跟随系统语言", () => {
    const store = new PreferencesStore(
      createInMemoryKeyValueBackend({ language: "pseudo" }),
    );

    expect(store.getLanguage("zh-CN")).toBe("zh");
  });
});

describe("PreferencesStore: 侧栏折叠状态", () => {
  it("没有保存过时侧栏默认展开", () => {
    const store = new PreferencesStore(createInMemoryKeyValueBackend());

    expect(store.isSidebarCollapsed()).toBe(false);
  });

  it("保存侧栏折叠状态后能读回, 再展开也能读回", () => {
    const store = new PreferencesStore(createInMemoryKeyValueBackend());

    store.setSidebarCollapsed(true);
    expect(store.isSidebarCollapsed()).toBe(true);

    store.setSidebarCollapsed(false);
    expect(store.isSidebarCollapsed()).toBe(false);
  });

  it("存储里的侧栏折叠状态不是布尔值时按展开处理", () => {
    const store = new PreferencesStore(
      createInMemoryKeyValueBackend({ isSidebarCollapsed: "yes" }),
    );

    expect(store.isSidebarCollapsed()).toBe(false);
  });
});

describe("PreferencesStore: 内容保护", () => {
  it("没有保存过时是关闭的", () => {
    const store = new PreferencesStore(createInMemoryKeyValueBackend());

    expect(store.isContentProtectionEnabled()).toBe(false);
  });

  it("保存后能读回, 关闭也能读回, 重新创建存储后仍在 (同一后端)", () => {
    const backend = createInMemoryKeyValueBackend();
    const store = new PreferencesStore(backend);

    store.setContentProtectionEnabled(true);
    expect(store.isContentProtectionEnabled()).toBe(true);
    expect(new PreferencesStore(backend).isContentProtectionEnabled()).toBe(
      true,
    );

    store.setContentProtectionEnabled(false);
    expect(store.isContentProtectionEnabled()).toBe(false);
  });

  it("存储里的值不是布尔值时按默认值 (关闭) 处理", () => {
    const store = new PreferencesStore(
      createInMemoryKeyValueBackend({ isContentProtectionEnabled: "yes" }),
    );

    expect(store.isContentProtectionEnabled()).toBe(false);
  });
});

describe("PreferencesStore: 自动锁定设置", () => {
  const customSettings: AutoLockSettings = {
    isIdleLockEnabled: false,
    idleMinutes: 60,
    isScreenLockEnabled: false,
    isSleepLockEnabled: true,
  };

  it("没有保存过时取默认设置", () => {
    const store = new PreferencesStore(createInMemoryKeyValueBackend());

    expect(store.getAutoLock()).toEqual(DEFAULT_AUTO_LOCK_SETTINGS);
  });

  it("保存后能读回, 重新创建存储后仍在 (同一后端)", () => {
    const backend = createInMemoryKeyValueBackend();
    new PreferencesStore(backend).setAutoLock(customSettings);

    expect(new PreferencesStore(backend).getAutoLock()).toEqual(customSettings);
  });

  it("存储里的值不是对象时取默认设置", () => {
    const store = new PreferencesStore(
      createInMemoryKeyValueBackend({ autoLock: "on" }),
    );

    expect(store.getAutoLock()).toEqual(DEFAULT_AUTO_LOCK_SETTINGS);
  });

  it("存储里个别字段不合法时该字段回落默认, 其余保留", () => {
    const store = new PreferencesStore(
      createInMemoryKeyValueBackend({
        autoLock: { ...customSettings, idleMinutes: 7, isSleepLockEnabled: 1 },
      }),
    );

    expect(store.getAutoLock()).toEqual({
      ...customSettings,
      idleMinutes: DEFAULT_AUTO_LOCK_SETTINGS.idleMinutes,
      isSleepLockEnabled: DEFAULT_AUTO_LOCK_SETTINGS.isSleepLockEnabled,
    });
  });
});
