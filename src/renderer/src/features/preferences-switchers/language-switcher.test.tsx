import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  createPreferencesTestEnvironment,
  type PreferencesTestEnvironment,
} from "@renderer/testing/preferences-test-environment";

import { LanguageSwitcher } from "./language-switcher";

/**
 * 在偏好环境里渲染语言切换控件.
 * @returns 渲染所用的偏好环境.
 */
async function renderSwitcher(): Promise<PreferencesTestEnvironment> {
  const environment = await createPreferencesTestEnvironment();
  render(<LanguageSwitcher />, { wrapper: environment.Providers });
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

describe("LanguageSwitcher 初始状态", () => {
  it("只有名为 语言 的一组分段, 含简体中文与 English 两档", async () => {
    await renderSwitcher();

    const group = screen.getByRole("group", { name: "语言" });
    expect(screen.queryByRole("group", { name: "主题" })).toBeNull();
    expect(group.querySelectorAll("button")).toHaveLength(2);
    ["简体中文", "English"].forEach((name) =>
      expect(screen.getByRole("button", { name })).toBeDefined(),
    );
  });

  it("按钮上显示语言简称, 按当前偏好标出选中项", async () => {
    await renderSwitcher();

    expect(screen.getByRole("button", { name: "简体中文" }).textContent).toBe(
      "中",
    );
    expect(screen.getByRole("button", { name: "English" }).textContent).toBe(
      "EN",
    );
    expect(pressedStateOf("简体中文")).toBe("true");
    expect(pressedStateOf("English")).toBe("false");
  });
});

describe("LanguageSwitcher 点击", () => {
  it("点击选项时经桥保存并把界面切换成该语言, 按钮上的简称不变", async () => {
    const { bridge } = await renderSwitcher();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "English" }));

    expect(
      await screen.findByRole("group", { name: "Language" }),
    ).toBeDefined();
    expect(bridge.setLanguage).toHaveBeenCalledWith("en");
    expect(pressedStateOf("English")).toBe("true");
    expect(screen.getByRole("button", { name: "English" }).textContent).toBe(
      "EN",
    );
    expect(screen.getByRole("button", { name: "简体中文" }).textContent).toBe(
      "中",
    );
  });

  it("重复点击已选中的选项不会保存", async () => {
    const { bridge } = await renderSwitcher();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "简体中文" }));

    expect(bridge.setLanguage).not.toHaveBeenCalled();
    expect(pressedStateOf("简体中文")).toBe("true");
  });
});
