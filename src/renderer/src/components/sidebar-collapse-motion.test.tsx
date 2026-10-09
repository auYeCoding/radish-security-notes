import { render, screen, within } from "@testing-library/react";
import { FolderIcon } from "lucide-react";
import { describe, expect, it } from "vitest";

import {
  expectMotionClasses,
  expectNoClassContaining,
} from "@renderer/testing/expect-motion-classes";
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
 * 随折叠收起或放出的尺寸类名片段: 分区标题块, 分隔线块与空状态说明块都不应带, 折叠前后占位才一样.
 */
const UNSIZED_BOX_FRAGMENTS: readonly string[] = [
  "w-0",
  "w-auto",
  "h-0",
  "h-auto",
];

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
    "折叠为 %s 时按钮内容靠起始侧且不留起始侧内边距与间距, 间距由文字容器与图标格承担",
    async (isCollapsed) => {
      const row = await renderRow(isCollapsed);
      const button = within(row).getByRole("button", { name: /^工作\s*3$/ });

      ["justify-start", "gap-0", "ps-0", "pe-3"].forEach((className) =>
        expect(button.classList.contains(className)).toBe(true),
      );
      expect(button.classList.contains("px-3")).toBe(false);
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
  it("展开时标题块淡入, 分隔线块淡出, 两块都不改变尺寸", () => {
    renderHeading(false);

    const titleBox = closestBox(screen.getByText("标签"));
    const separatorBox = closestBox(
      screen.getByRole("separator", { hidden: true }),
    );
    expect(titleBox?.getAttribute("data-state")).toBe("expanded");
    expect(separatorBox?.getAttribute("data-state")).toBe("collapsed");
    expectMotionClasses(
      titleBox?.firstElementChild ?? null,
      COLLAPSE_FADE_CLASSES.expanded,
    );
    expectMotionClasses(
      separatorBox?.firstElementChild ?? null,
      COLLAPSE_FADE_CLASSES.collapsed,
    );
    expectNoClassContaining(titleBox, UNSIZED_BOX_FRAGMENTS);
    expectNoClassContaining(separatorBox, UNSIZED_BOX_FRAGMENTS);
    expect(separatorBox?.hasAttribute("inert")).toBe(true);
  });

  it("折叠时标题块淡出, 分隔线块淡入, 两者交叉, 两块都不改变尺寸", () => {
    renderHeading(true);

    const titleBox = closestBox(screen.getByText("标签"));
    const separatorBox = closestBox(screen.getByRole("separator"));
    expectMotionClasses(
      titleBox?.firstElementChild ?? null,
      COLLAPSE_FADE_CLASSES.collapsed,
    );
    expectMotionClasses(
      separatorBox?.firstElementChild ?? null,
      COLLAPSE_FADE_CLASSES.expanded,
    );
    expectNoClassContaining(titleBox, UNSIZED_BOX_FRAGMENTS);
    expectNoClassContaining(separatorBox, UNSIZED_BOX_FRAGMENTS);
    expect(titleBox?.hasAttribute("inert")).toBe(true);
    expect(separatorBox?.hasAttribute("inert")).toBe(false);
  });
});

describe("分区标题的叠放", () => {
  it.each([false, true])(
    "折叠为 %s 时标题块与分隔线块叠放在同一个网格单元里, 分隔线从固定偏移处开始, 与顶栏下边线对齐",
    (isCollapsed) => {
      renderHeading(isCollapsed);

      const titleBox = closestBox(screen.getByText("标签"));
      const separatorBox = closestBox(
        screen.getByRole("separator", { hidden: true }),
      );
      expect(titleBox?.parentElement).toBe(separatorBox?.parentElement);
      expect(titleBox?.parentElement?.classList.contains("grid")).toBe(true);
      ["col-start-1", "row-start-1"].forEach((className) => {
        expect(titleBox?.classList.contains(className)).toBe(true);
        expect(separatorBox?.classList.contains(className)).toBe(true);
      });
      expect(separatorBox?.classList.contains("self-start")).toBe(true);
      expect(separatorBox?.classList.contains("self-center")).toBe(false);
      expect(
        separatorBox?.classList.contains("mt-(--sidebar-separator-offset)"),
      ).toBe(true);
      expect(
        titleBox?.classList.contains("mt-(--sidebar-separator-offset)"),
      ).toBe(false);
    },
  );
});

describe("空状态的折叠过渡", () => {
  it("折叠时只淡出, 展开时恢复, 两种状态占位一样", () => {
    const { rerender } = render(
      <SidebarCollapseContext.Provider value={true}>
        <EmptyState message="还没有标签" />
      </SidebarCollapseContext.Provider>,
    );
    const box = closestBox(screen.getByText("还没有标签"));
    const collapsedClasses = Array.from(box?.classList ?? []);

    expectNoClassContaining(box, UNSIZED_BOX_FRAGMENTS);
    expectMotionClasses(
      box?.firstElementChild ?? null,
      COLLAPSE_FADE_CLASSES.collapsed,
    );

    rerender(
      <SidebarCollapseContext.Provider value={false}>
        <EmptyState message="还没有标签" />
      </SidebarCollapseContext.Provider>,
    );

    expect(Array.from(box?.classList ?? [])).toEqual(collapsedClasses);
    expect(box).toBe(closestBox(screen.getByText("还没有标签")));
  });
});
