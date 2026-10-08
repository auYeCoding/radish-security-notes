import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  createPreferencesTestEnvironment,
  type PreferencesTestEnvironment,
} from "@renderer/testing/preferences-test-environment";

import { ThemeSwitcher } from "./theme-switcher";

/**
 * 在偏好环境里渲染主题切换控件.
 * @returns 渲染所用的偏好环境.
 */
async function renderSwitcher(): Promise<PreferencesTestEnvironment> {
  const environment = await createPreferencesTestEnvironment();
  render(<ThemeSwitcher />, { wrapper: environment.Providers });
  return environment;
}

/**
 * 读取指定名称的分段按钮的选中状态.
 * @param name 按钮的可访问名称.
 * @returns aria-pressed 的取值.
 */
function pressedStateOf(name: string): string | null {
  return screen.getByRole("button", { name }).getAttribute("aria-pressed");
}

describe("ThemeSwitcher 初始状态", () => {
  it("只有名为 主题 的一组分段, 含跟随系统, 浅色, 深色三档", async () => {
    await renderSwitcher();

    const group = screen.getByRole("group", { name: "主题" });
    expect(screen.queryByRole("group", { name: "语言" })).toBeNull();
    expect(group.querySelectorAll("button")).toHaveLength(3);
    ["跟随系统", "浅色", "深色"].forEach((name) =>
      expect(screen.getByRole("button", { name })).toBeDefined(),
    );
  });

  it("按当前偏好标出选中项", async () => {
    await renderSwitcher();

    expect(pressedStateOf("跟随系统")).toBe("true");
    expect(pressedStateOf("浅色")).toBe("false");
    expect(pressedStateOf("深色")).toBe("false");
  });
});

describe("ThemeSwitcher 点击", () => {
  it("点击选项时经桥保存并更新选中项", async () => {
    const { bridge, store } = await renderSwitcher();

    await userEvent.setup().click(screen.getByRole("button", { name: "深色" }));

    await waitFor(() => {
      expect(store.getState().themeSource).toBe("dark");
    });
    expect(bridge.setThemeSource).toHaveBeenCalledWith("dark");
    expect(pressedStateOf("深色")).toBe("true");
    expect(pressedStateOf("跟随系统")).toBe("false");
  });

  it("重复点击已选中的选项不会保存", async () => {
    const { bridge } = await renderSwitcher();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "跟随系统" }));

    expect(bridge.setThemeSource).not.toHaveBeenCalled();
    expect(pressedStateOf("跟随系统")).toBe("true");
  });
});

describe("ThemeSwitcher 保存失败", () => {
  it("桥拒绝保存时选中项保持原样, 不产生未处理的拒绝", async () => {
    const setThemeSource = vi.fn(() => Promise.reject(new Error("ipc down")));
    const environment = await createPreferencesTestEnvironment({
      setThemeSource,
    });
    render(<ThemeSwitcher />, { wrapper: environment.Providers });

    await userEvent.setup().click(screen.getByRole("button", { name: "深色" }));

    await waitFor(() => expect(setThemeSource).toHaveBeenCalledWith("dark"));
    expect(pressedStateOf("跟随系统")).toBe("true");
    expect(pressedStateOf("深色")).toBe("false");
  });
});
