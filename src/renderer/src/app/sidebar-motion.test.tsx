import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  COLLAPSE_EXTENT_TRANSITION,
  TOGGLE_ROW_ALIGNMENT_CLASSES,
  TOGGLE_ROW_SPACER_CLASSES,
} from "@renderer/components/ui/collapse-motion";
import { createEntryTestEnvironment } from "@renderer/testing/entry-test-environment";
import { expectMotionClasses } from "@renderer/testing/expect-motion-classes";

import { Sidebar } from "./sidebar";

/**
 * 在条目环境里渲染侧栏.
 * @param isCollapsed 偏好里侧栏一开始是否已折叠.
 * @returns 侧栏元素.
 */
async function renderSidebar(isCollapsed: boolean): Promise<HTMLElement> {
  const environment = await createEntryTestEnvironment({});
  if (isCollapsed) {
    await environment.store.getState().setSidebarCollapsed(true);
  }
  render(<Sidebar />, { wrapper: environment.Providers });
  return screen.getByRole("complementary");
}

/**
 * 取侧栏顶部放切换按钮的入口行.
 * @param sidebar 侧栏元素.
 * @param buttonName 切换按钮当前的无障碍名称.
 * @returns 入口行元素.
 */
function getToggleRow(
  sidebar: HTMLElement,
  buttonName: string,
): HTMLElement | null {
  return within(sidebar).getByRole("button", { name: buttonName })
    .parentElement;
}

describe("侧栏装配的折叠过渡", () => {
  it.each([false, true])(
    "折叠为 %s 时侧栏带宽度过渡并裁掉溢出, data-state 与宽度类名随状态",
    async (isCollapsed) => {
      const sidebar = await renderSidebar(isCollapsed);

      expectMotionClasses(sidebar, COLLAPSE_EXTENT_TRANSITION);
      expect(sidebar.classList.contains("overflow-hidden")).toBe(true);
      expect(sidebar.dataset.state).toBe(
        isCollapsed ? "collapsed" : "expanded",
      );
      expect(
        sidebar.classList.contains(
          isCollapsed ? "w-(--sidebar-collapsed-width)" : "w-(--sidebar-width)",
        ),
      ).toBe(true);
    },
  );

  it("入口行展开时后占位份额为零, 按钮靠结束侧", async () => {
    const sidebar = await renderSidebar(false);
    const row = getToggleRow(sidebar, "收起侧栏");

    expectMotionClasses(row, TOGGLE_ROW_SPACER_CLASSES);
    expectMotionClasses(row, TOGGLE_ROW_ALIGNMENT_CLASSES.expanded);
    expect(row?.classList.contains("justify-end")).toBe(false);
  });

  it("入口行折叠时后占位份额与前占位相等, 按钮居中", async () => {
    const sidebar = await renderSidebar(true);
    const row = getToggleRow(sidebar, "展开侧栏");

    expectMotionClasses(row, TOGGLE_ROW_SPACER_CLASSES);
    expectMotionClasses(row, TOGGLE_ROW_ALIGNMENT_CLASSES.collapsed);
    expect(row?.classList.contains("justify-center")).toBe(false);
  });

  it("点击切换按钮后 data-state 与无障碍名称随之变化", async () => {
    const sidebar = await renderSidebar(false);

    await userEvent
      .setup()
      .click(within(sidebar).getByRole("button", { name: "收起侧栏" }));

    expect(sidebar.dataset.state).toBe("collapsed");
    expect(screen.getByRole("button", { name: "展开侧栏" })).toBeDefined();
  });
});
