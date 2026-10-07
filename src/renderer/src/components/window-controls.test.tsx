import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createPreferencesTestEnvironment } from "@renderer/testing/preferences-test-environment";

import { WindowControls } from "./window-controls";

/**
 * 渲染出的窗口按钮组与传给它的三个回调间谍.
 */
interface RenderedControls {
  /**
   * 最小化回调.
   */
  readonly onMinimize: ReturnType<typeof vi.fn>;
  /**
   * 最大化或还原回调.
   */
  readonly onToggleMaximize: ReturnType<typeof vi.fn>;
  /**
   * 关闭回调.
   */
  readonly onClose: ReturnType<typeof vi.fn>;
  /**
   * 切换界面语言.
   */
  readonly changeLanguage: (language: "zh" | "en") => Promise<void>;
}

/**
 * 在偏好环境里渲染窗口按钮组.
 * @param isMaximized 窗口是否最大化.
 * @returns 回调间谍与切换语言的函数.
 */
async function renderControls(isMaximized = false): Promise<RenderedControls> {
  const environment = await createPreferencesTestEnvironment();
  const onMinimize = vi.fn();
  const onToggleMaximize = vi.fn();
  const onClose = vi.fn();
  render(
    <WindowControls
      isMaximized={isMaximized}
      onMinimize={onMinimize}
      onToggleMaximize={onToggleMaximize}
      onClose={onClose}
    />,
    { wrapper: environment.Providers },
  );
  return {
    onMinimize,
    onToggleMaximize,
    onClose,
    changeLanguage: (language) =>
      act(() =>
        environment.i18n.changeLanguage(language).then(() => undefined),
      ),
  };
}

describe("WindowControls 三个按钮", () => {
  it("依次是最小化, 最大化, 关闭, 整组标为不拖动区域", async () => {
    await renderControls();

    const group = screen.getByRole("group", { name: "窗口控制" });
    const names = Array.from(group.querySelectorAll("button")).map((button) =>
      button.getAttribute("aria-label"),
    );
    expect(names).toEqual(["最小化", "最大化", "关闭"]);
    expect(group.classList.contains("app-region-no-drag")).toBe(true);
  });

  it("每个按钮标为不拖动区域, 点击它不会变成拖动窗口", async () => {
    await renderControls();

    for (const name of ["最小化", "最大化", "关闭"]) {
      const button = screen.getByRole("button", { name });
      expect(button.classList.contains("app-region-no-drag")).toBe(true);
    }
  });

  it("点击各按钮只执行对应的回调", async () => {
    const controls = await renderControls();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "最小化" }));
    await user.click(screen.getByRole("button", { name: "最大化" }));
    await user.click(screen.getByRole("button", { name: "关闭" }));

    expect(controls.onMinimize).toHaveBeenCalledOnce();
    expect(controls.onToggleMaximize).toHaveBeenCalledOnce();
    expect(controls.onClose).toHaveBeenCalledOnce();
  });

  it("按钮只有图标, 图标对读屏软件隐藏, 名称在无障碍标签里", async () => {
    await renderControls();

    for (const button of screen.getAllByRole("button")) {
      expect(button.textContent).toBe("");
      expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
        "true",
      );
    }
  });
});

describe("WindowControls 最大化与还原", () => {
  it("未最大化时第二个按钮是最大化, 图标是单个方框", async () => {
    await renderControls(false);

    const button = screen.getByRole("button", { name: "最大化" });
    expect(
      button.querySelector("svg")?.classList.contains("lucide-square"),
    ).toBe(true);
    expect(screen.queryByRole("button", { name: "还原" })).toBeNull();
  });

  it("已最大化时第二个按钮变为还原, 图标是叠放的两个方框, 点击仍执行切换回调", async () => {
    const controls = await renderControls(true);

    const button = screen.getByRole("button", { name: "还原" });
    expect(button.querySelector("svg")?.classList.contains("lucide-copy")).toBe(
      true,
    );
    expect(screen.queryByRole("button", { name: "最大化" })).toBeNull();
    await userEvent.setup().click(button);
    expect(controls.onToggleMaximize).toHaveBeenCalledOnce();
  });
});

describe("WindowControls 危险色与语言", () => {
  it("只有关闭按钮悬停时用危险色 token 高亮", async () => {
    await renderControls();

    const close = screen.getByRole("button", { name: "关闭" });
    expect(close.classList.contains("hover:text-destructive")).toBe(true);
    expect(close.classList.contains("hover:bg-destructive/20")).toBe(true);
    for (const name of ["最小化", "最大化"]) {
      const button = screen.getByRole("button", { name });
      expect(button.classList.contains("hover:text-destructive")).toBe(false);
      expect(button.classList.contains("hover:bg-destructive/20")).toBe(false);
    }
  });

  it("切换成英文后名称随之切换, 图标不变", async () => {
    const controls = await renderControls(false);
    const iconBefore = screen
      .getByRole("button", { name: "最大化" })
      .querySelector("svg")?.className;

    await controls.changeLanguage("en");

    expect(
      screen.getByRole("group", { name: "Window controls" }),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "Minimize" })).toBeDefined();
    const maximize = screen.getByRole("button", { name: "Maximize" });
    expect(maximize.querySelector("svg")?.className).toEqual(iconBefore);
    expect(screen.getByRole("button", { name: "Close" })).toBeDefined();
  });

  it("英文下已最大化时第二个按钮名称是 Restore", async () => {
    const controls = await renderControls(true);

    await controls.changeLanguage("en");

    expect(screen.getByRole("button", { name: "Restore" })).toBeDefined();
  });
});
