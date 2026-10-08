import { render, screen, within } from "@testing-library/react";
import { FolderIcon } from "lucide-react";
import { describe, expect, it } from "vitest";

import { expectMotionClasses } from "@renderer/testing/expect-motion-classes";
import { createPreferencesTestEnvironment } from "@renderer/testing/preferences-test-environment";

import { EmptyState } from "./empty-state";
import { PaneHeading } from "./pane-heading";
import { SidebarCollapseContext } from "./sidebar-collapse-context";
import { SidebarNavItem } from "./sidebar-nav-item";
import { Button } from "./ui/button";
import {
  COLLAPSE_BOX_AXIS_CLASSES,
  COLLAPSE_FADE_CLASSES,
  COLLAPSIBLE_TEXT_STATE_CLASSES,
} from "./ui/collapse-motion";

/**
 * 渲染一行带行尾操作的侧栏入口.
 * @param isCollapsed 侧栏是否折叠.
 * @returns 行元素.
 */
async function renderRow(isCollapsed: boolean): Promise<HTMLElement> {
  const environment = await createPreferencesTestEnvironment();
  render(
    <SidebarCollapseContext.Provider value={isCollapsed}>
      <ul>
        <SidebarNavItem
          label="工作"
          icon={<FolderIcon aria-hidden="true" />}
          count={3}
          isSelected={false}
          onSelect={() => undefined}
          actions={<Button>更多</Button>}
        />
      </ul>
    </SidebarCollapseContext.Provider>,
    { wrapper: environment.Providers },
  );
  return screen.getByRole("listitem");
}

/**
 * 取出元素最近的可折叠盒子.
 * @param element 盒子里的元素.
 * @returns 盒子外层元素, 没有时是 null.
 */
function closestBox(element: HTMLElement): Element | null {
  return element.closest("[data-slot='collapsible-box']");
}

/**
 * 渲染分区标题.
 * @param isCollapsed 侧栏是否折叠.
 */
function renderHeading(isCollapsed: boolean): void {
  render(
    <SidebarCollapseContext.Provider value={isCollapsed}>
      <PaneHeading title="标签" action={<Button>新建</Button>} />
    </SidebarCollapseContext.Provider>,
  );
}

describe("侧栏行的折叠过渡", () => {
  it.each([false, true])(
    "折叠为 %s 时按钮居中且不留间距, 间距由文字容器承担",
    async (isCollapsed) => {
      const row = await renderRow(isCollapsed);
      const button = within(row).getByRole("button", { name: /^工作\s*3$/ });

      ["justify-center", "gap-0", "px-3"].forEach((className) =>
        expect(button.classList.contains(className)).toBe(true),
      );
      expect(button.classList.contains("justify-start")).toBe(false);
    },
  );

  it("文字容器内层带淡入淡出, 条目数随之淡出", async () => {
    const row = await renderRow(true);
    const text = row.querySelector("[data-slot='sidebar-nav-item-text']");

    expectMotionClasses(text, COLLAPSIBLE_TEXT_STATE_CLASSES.collapsed);
    expectMotionClasses(
      text?.firstElementChild ?? null,
      COLLAPSE_FADE_CLASSES.collapsed,
    );
    expect(within(row).getByText("3").closest("[data-slot]")).toBe(text);
  });

  it("展开时行尾操作的盒子沿宽度展开", async () => {
    const expandedBox = closestBox(
      within(await renderRow(false)).getByText("更多"),
    );

    expectMotionClasses(expandedBox, COLLAPSE_BOX_AXIS_CLASSES.width.expanded);
  });

  it("折叠时行尾操作的盒子取零宽度并淡出", async () => {
    const collapsedBox = closestBox(
      within(await renderRow(true)).getByText("更多"),
    );

    expectMotionClasses(
      collapsedBox,
      COLLAPSE_BOX_AXIS_CLASSES.width.collapsed,
    );
    expectMotionClasses(
      collapsedBox?.firstElementChild ?? null,
      COLLAPSE_FADE_CLASSES.collapsed,
    );
  });
});

describe("分区标题的折叠过渡", () => {
  it("展开时标题块展开, 分隔线块收起并淡出", () => {
    renderHeading(false);

    const titleBox = closestBox(screen.getByText("标签"));
    const separatorBox = closestBox(
      screen.getByRole("separator", { hidden: true }),
    );
    expect(titleBox?.getAttribute("data-state")).toBe("expanded");
    expect(separatorBox?.getAttribute("data-state")).toBe("collapsed");
    expectMotionClasses(titleBox, COLLAPSE_BOX_AXIS_CLASSES.height.expanded);
    expectMotionClasses(
      separatorBox,
      COLLAPSE_BOX_AXIS_CLASSES.height.collapsed,
    );
    expect(separatorBox?.hasAttribute("inert")).toBe(true);
  });

  it("折叠时标题块收起并淡出, 分隔线块展开并淡入, 两者交叉", () => {
    renderHeading(true);

    const titleBox = closestBox(screen.getByText("标签"));
    const separatorBox = closestBox(screen.getByRole("separator"));
    expectMotionClasses(titleBox, COLLAPSE_BOX_AXIS_CLASSES.height.collapsed);
    expectMotionClasses(
      titleBox?.firstElementChild ?? null,
      COLLAPSE_FADE_CLASSES.collapsed,
    );
    expectMotionClasses(
      separatorBox,
      COLLAPSE_BOX_AXIS_CLASSES.height.expanded,
    );
    expectMotionClasses(
      separatorBox?.firstElementChild ?? null,
      COLLAPSE_FADE_CLASSES.expanded,
    );
    expect(separatorBox?.hasAttribute("inert")).toBe(false);
  });
});

describe("空状态的折叠过渡", () => {
  it("折叠时沿高度收起并淡出, 展开时恢复", () => {
    const { rerender } = render(
      <SidebarCollapseContext.Provider value={true}>
        <EmptyState message="还没有标签" />
      </SidebarCollapseContext.Provider>,
    );
    const box = closestBox(screen.getByText("还没有标签"));

    expectMotionClasses(box, COLLAPSE_BOX_AXIS_CLASSES.height.collapsed);
    expectMotionClasses(
      box?.firstElementChild ?? null,
      COLLAPSE_FADE_CLASSES.collapsed,
    );

    rerender(
      <SidebarCollapseContext.Provider value={false}>
        <EmptyState message="还没有标签" />
      </SidebarCollapseContext.Provider>,
    );

    expectMotionClasses(box, COLLAPSE_BOX_AXIS_CLASSES.height.expanded);
    expect(box).toBe(closestBox(screen.getByText("还没有标签")));
  });
});
