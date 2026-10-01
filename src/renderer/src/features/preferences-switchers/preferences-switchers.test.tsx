import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  createPreferencesTestEnvironment,
  type PreferencesTestEnvironment,
} from "@renderer/testing/preferences-test-environment";

import { PreferencesSwitchers } from "./preferences-switchers";

/**
 * 在偏好环境里渲染主题与语言切换控件.
 * @returns 渲染所用的偏好环境.
 */
async function renderSwitchers(): Promise<PreferencesTestEnvironment> {
  const environment = await createPreferencesTestEnvironment();
  render(<PreferencesSwitchers />, { wrapper: environment.Providers });
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

describe("PreferencesSwitchers 初始状态", () => {
  it("两组分段控件都有名称", async () => {
    await renderSwitchers();

    expect(screen.getByRole("group", { name: "主题" })).toBeDefined();
    expect(screen.getByRole("group", { name: "语言" })).toBeDefined();
  });

  it("按当前偏好标出选中项", async () => {
    await renderSwitchers();

    expect(pressedStateOf("跟随系统")).toBe("true");
    expect(pressedStateOf("深色")).toBe("false");
    expect(pressedStateOf("简体中文")).toBe("true");
    expect(pressedStateOf("English")).toBe("false");
  });
});

describe("PreferencesSwitchers 点击", () => {
  it("点击主题选项时经桥保存并更新选中项", async () => {
    const { bridge, store } = await renderSwitchers();

    await userEvent.setup().click(screen.getByRole("button", { name: "深色" }));

    await waitFor(() => {
      expect(store.getState().themeSource).toBe("dark");
    });
    expect(bridge.setThemeSource).toHaveBeenCalledWith("dark");
    expect(pressedStateOf("深色")).toBe("true");
  });

  it("点击语言选项时经桥保存并把界面切换成该语言", async () => {
    const { bridge } = await renderSwitchers();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "English" }));

    expect(
      await screen.findByRole("group", { name: "Language" }),
    ).toBeDefined();
    expect(bridge.setLanguage).toHaveBeenCalledWith("en");
    expect(pressedStateOf("System")).toBe("true");
    expect(pressedStateOf("English")).toBe("true");
  });

  it("重复点击已选中的选项不会取消选中也不会保存", async () => {
    const { bridge } = await renderSwitchers();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "跟随系统" }));

    expect(bridge.setThemeSource).not.toHaveBeenCalled();
    expect(pressedStateOf("跟随系统")).toBe("true");
  });
});
