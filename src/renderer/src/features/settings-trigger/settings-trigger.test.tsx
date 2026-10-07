import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SidebarCollapseContext } from "@renderer/components/sidebar-collapse-context";
import {
  createPreferencesTestEnvironment,
  type PreferencesTestEnvironment,
} from "@renderer/testing/preferences-test-environment";

import { SettingsTrigger } from "./settings-trigger";

/**
 * 等待悬停提示出现的最长时间, 单位毫秒, 比查询的默认超时长, 全部测试并行运行时也不误报.
 */
const TOOLTIP_WAIT_MILLISECONDS = 3000;

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
 * @param isCollapsed 侧栏是否折叠, 默认展开.
 * @returns 打开回调的间谍与偏好环境.
 */
async function renderTrigger(
  badge?: React.ReactNode,
  isCollapsed = false,
): Promise<RenderedTrigger> {
  const environment = await createPreferencesTestEnvironment();
  const onOpen = vi.fn();
  render(
    <SidebarCollapseContext.Provider value={isCollapsed}>
      <SettingsTrigger onOpen={onOpen} badge={badge} />
    </SidebarCollapseContext.Provider>,
    { wrapper: environment.Providers },
  );
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

  it("展开时按钮上有图标和文字, 没有状态圆点和屏幕外隐藏", async () => {
    await renderTrigger(<span>失败标记</span>);

    const button = screen.getByRole("button", { name: /设置/ });
    const text = button.querySelector("[data-slot='settings-trigger-text']");
    expect(button.querySelector("svg")).not.toBeNull();
    expect(text?.classList.contains("sr-only")).toBe(false);
    expect(button.querySelector("[data-slot='status-dot']")).toBeNull();
  });
});

describe("设置按钮: 侧栏折叠时", () => {
  it("按钮只剩图标, 文字收起为屏幕外隐藏, 名称仍是 设置", async () => {
    const { onOpen } = await renderTrigger(undefined, true);

    const button = screen.getByRole("button", { name: "设置" });
    const text = button.querySelector("[data-slot='settings-trigger-text']");
    expect(button.querySelector("svg")).not.toBeNull();
    expect(text?.classList.contains("sr-only")).toBe(true);
    expect(text?.textContent).toBe("设置");
    await userEvent.setup().click(button);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("悬停时提示 设置", async () => {
    await renderTrigger(undefined, true);
    expect(
      screen.queryByText("设置", { selector: "[data-slot='tooltip-content']" }),
    ).toBeNull();

    await userEvent.setup().hover(screen.getByRole("button", { name: "设置" }));

    expect(
      await screen.findByText(
        "设置",
        { selector: "[data-slot='tooltip-content']" },
        { timeout: TOOLTIP_WAIT_MILLISECONDS },
      ),
    ).toBeDefined();
  });

  it("没有标记时图标上没有状态圆点", async () => {
    await renderTrigger(false, true);

    const button = screen.getByRole("button", { name: "设置" });
    expect(button.querySelector("[data-slot='status-dot']")).toBeNull();
  });

  it("有标记时图标上显示状态圆点, 标记文字仍在按钮的无障碍名称里", async () => {
    await renderTrigger(<span>自动备份失败</span>, true);

    const button = screen.getByRole("button", { name: /设置/ });
    expect(button.querySelector("[data-slot='status-dot']")).not.toBeNull();
    expect(button.getAttribute("aria-label")).toBeNull();
    expect(screen.getByRole("button", { name: /^设置\s*自动备份失败$/ })).toBe(
      button,
    );
  });
});
