import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  createPreferencesTestEnvironment,
  type PreferencesTestEnvironment,
} from "@renderer/testing/preferences-test-environment";

import { SettingsTrigger } from "./settings-trigger";

/**
 * 渲染设置按钮后拿到的结果.
 */
interface RenderedTrigger {
  /**
   * 点击按钮时被调用的间谍.
   */
  readonly onOpen: () => void;
  /**
   * 渲染所用的偏好环境.
   */
  readonly environment: PreferencesTestEnvironment;
}

/**
 * 在偏好环境里渲染设置按钮.
 * @param badge 放在按钮文字之后的标记, 不给时没有标记.
 * @returns 打开回调的间谍与偏好环境.
 */
async function renderTrigger(
  badge?: React.ReactNode,
): Promise<RenderedTrigger> {
  const environment = await createPreferencesTestEnvironment();
  const onOpen = vi.fn();
  render(<SettingsTrigger onOpen={onOpen} badge={badge} />, {
    wrapper: environment.Providers,
  });
  return { onOpen, environment };
}

describe("设置按钮", () => {
  it("按钮名称是 设置, 点击时通知调用方打开", async () => {
    const { onOpen } = await renderTrigger();

    await userEvent.setup().click(screen.getByRole("button", { name: "设置" }));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("给出标记时标记显示在按钮上", async () => {
    await renderTrigger(<span>失败标记</span>);

    expect(screen.getByRole("button", { name: /设置/ }).textContent).toContain(
      "失败标记",
    );
  });

  it("没有给出标记时按钮上只有按钮名称", async () => {
    await renderTrigger();

    expect(screen.getByRole("button", { name: "设置" }).textContent).toBe(
      "设置",
    );
  });

  it("界面切到英文后按钮名称是 Settings", async () => {
    const { environment } = await renderTrigger();

    await act(() => environment.i18n.changeLanguage("en"));

    expect(screen.getByRole("button", { name: "Settings" })).toBeDefined();
  });
});
