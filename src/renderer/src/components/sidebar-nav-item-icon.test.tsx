import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectMotionClasses } from "@renderer/testing/expect-motion-classes";

import { SidebarNavItemIcon } from "./sidebar-nav-item-icon";
import { COLLAPSE_SPACE_TRANSITION } from "./ui/collapse-motion";

/**
 * 渲染带测试图标的图标格.
 * @param isCollapsed 侧栏是否折叠.
 * @returns 图标格元素.
 */
function renderIconCell(isCollapsed: boolean): Element | null {
  render(
    <SidebarNavItemIcon
      isCollapsed={isCollapsed}
      icon={<svg data-testid="row-icon" aria-hidden="true" />}
    />,
  );
  return screen.getByTestId("row-icon").parentElement;
}

describe("侧栏行的图标格", () => {
  it.each([false, true])(
    "折叠为 %s 时是与图标同宽的方格, 图标在里面居中, 起始侧外边距带空间过渡",
    (isCollapsed) => {
      const cell = renderIconCell(isCollapsed);

      expectMotionClasses(cell, COLLAPSE_SPACE_TRANSITION);
      expectMotionClasses(
        cell,
        "inline-flex size-4 shrink-0 items-center justify-center",
      );
    },
  );

  it("展开时起始侧外边距是行的内边距, 不用折叠态的偏移", () => {
    const cell = renderIconCell(false);

    expect(cell?.classList.contains("ms-3")).toBe(true);
    expect(cell?.classList.contains("ms-(--sidebar-row-icon-inset)")).toBe(
      false,
    );
  });

  it("折叠时起始侧外边距取折叠态居中所需的偏移, 图标只在两个终态之间滑动", () => {
    const cell = renderIconCell(true);

    expect(cell?.classList.contains("ms-(--sidebar-row-icon-inset)")).toBe(
      true,
    );
    expect(cell?.classList.contains("ms-3")).toBe(false);
  });
});
