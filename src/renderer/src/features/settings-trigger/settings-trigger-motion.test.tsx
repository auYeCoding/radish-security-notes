import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SidebarCollapseContext } from "@renderer/components/sidebar-collapse-context";
import {
  COLLAPSE_FADE_CLASSES,
  COLLAPSE_FADE_TRANSITION,
  COLLAPSE_SPACE_TRANSITION,
  COLLAPSIBLE_TEXT_BASE_CLASSES,
} from "@renderer/components/ui/collapse-motion";
import { expectMotionClasses } from "@renderer/testing/expect-motion-classes";
import { createPreferencesTestEnvironment } from "@renderer/testing/preferences-test-environment";

import { SettingsTrigger } from "./settings-trigger";

/**
 * 渲染带失败标记的设置按钮.
 * @param isCollapsed 侧栏是否折叠.
 * @returns 设置按钮元素.
 */
async function renderTrigger(isCollapsed: boolean): Promise<HTMLElement> {
  const environment = await createPreferencesTestEnvironment();
  render(
    <SidebarCollapseContext.Provider value={isCollapsed}>
      <SettingsTrigger onOpen={() => undefined} badge={<span>失败标记</span>} />
    </SidebarCollapseContext.Provider>,
    { wrapper: environment.Providers },
  );
  return screen.getByRole("button", { name: /设置/ });
}

/**
 * 取出设置按钮里的文字区外层元素.
 * @param button 设置按钮.
 * @returns 文字区外层元素.
 */
function getText(button: HTMLElement): Element | null {
  return button.querySelector("[data-slot='settings-trigger-text']");
}

/**
 * 取出设置按钮里的图标格元素, 即状态圆点所在的元素.
 * @param button 设置按钮.
 * @returns 图标格元素.
 */
function getIconCell(button: HTMLElement): Element | null {
  return (
    button.querySelector("[data-slot='status-dot']")?.parentElement ?? null
  );
}

describe("设置按钮的折叠过渡: 展开", () => {
  it("按钮固定为图标尺寸并居中, 内边距与间距交给图标格与文字区", async () => {
    const button = await renderTrigger(false);

    ["w-full", "justify-center", "size-8"].forEach((className) =>
      expect(button.classList.contains(className)).toBe(true),
    );
    expect(button.classList.contains("justify-start")).toBe(false);
  });

  it("图标格留起始侧内边距, 文字区占满剩余宽度并留结束侧内边距", async () => {
    const button = await renderTrigger(false);

    expectMotionClasses(getIconCell(button), COLLAPSE_SPACE_TRANSITION);
    expectMotionClasses(getIconCell(button), "ps-2 pe-1.5");
    expectMotionClasses(getText(button), COLLAPSIBLE_TEXT_BASE_CLASSES);
    expectMotionClasses(getText(button), "grow pe-2.5");
  });

  it("状态圆点已淡出, 失败标记文字在淡入的内层里", async () => {
    const button = await renderTrigger(false);

    const dot = button.querySelector("[data-slot='status-dot']");
    expectMotionClasses(dot, COLLAPSE_FADE_TRANSITION);
    expectMotionClasses(dot, COLLAPSE_FADE_CLASSES.collapsed);
    const content = getText(button)?.firstElementChild ?? null;
    expectMotionClasses(content, COLLAPSE_FADE_CLASSES.expanded);
    expect(content?.textContent).toBe("设置失败标记");
  });
});

describe("设置按钮的折叠过渡: 折叠", () => {
  it("图标格内边距归零, 文字区份额与内边距归零", async () => {
    const button = await renderTrigger(true);

    expectMotionClasses(getIconCell(button), "ps-0 pe-0");
    expectMotionClasses(getText(button), "grow-0 pe-0");
    expect(getText(button)?.classList.contains("sr-only")).toBe(false);
  });

  it("状态圆点淡入, 文字与失败标记淡出但仍在无障碍名称里", async () => {
    const button = await renderTrigger(true);

    const dot = button.querySelector("[data-slot='status-dot']");
    expectMotionClasses(dot, COLLAPSE_FADE_CLASSES.expanded);
    expectMotionClasses(
      getText(button)?.firstElementChild ?? null,
      COLLAPSE_FADE_CLASSES.collapsed,
    );
    expect(screen.getByRole("button", { name: /^设置\s*失败标记$/ })).toBe(
      button,
    );
  });
});
