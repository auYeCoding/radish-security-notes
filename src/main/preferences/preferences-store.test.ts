import { describe, expect, it } from "vitest";

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
