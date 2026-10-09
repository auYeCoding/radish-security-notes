import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FolderIcon } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { expectMotionClasses } from "@renderer/testing/expect-motion-classes";
import {
  createPreferencesTestEnvironment,
  type PreferencesTestEnvironment,
} from "@renderer/testing/preferences-test-environment";

import { SidebarCollapseContext } from "./sidebar-collapse-context";
import { SidebarNavItem } from "./sidebar-nav-item";
import { Button } from "./ui/button";
import { COLLAPSIBLE_TEXT_STATE_CLASSES } from "./ui/collapse-motion";

/**
 * 等待悬停提示出现的最长时间, 单位毫秒, 比查询的默认超时长, 全部测试并行运行时也不误报.
 */
const TOOLTIP_WAIT_MILLISECONDS = 3000;

/**
 * 等待提示收起动画结束的时间, 单位毫秒.
 */
const TOOLTIP_SETTLE_MILLISECONDS = 50;

/**
 * 测试行的无障碍名称: 名称加条目数.
 */
const ROW_NAME = /^工作\s*3$/;

/**
 * 测试行折叠时的提示文字.
 */
const ROW_TOOLTIP = "工作 (3)";

/**
 * 渲染一行入口所用的选项.
 */
interface RenderRowOptions {
  /**
   * 侧栏是否折叠.
   */
  readonly isCollapsed: boolean;
  /**
   * 这一行是否被选中, 默认未选中.
   */
  readonly isSelected?: boolean;
}

/**
 * 渲染一行入口后拿到的结果.
 */
interface RenderedRow {
  /**
   * 点击这一行时被调用的间谍.
   */
  readonly onSelect: () => void;
  /**
   * 渲染所用的偏好环境.
   */
  readonly environment: PreferencesTestEnvironment;
}

/**
 * 在偏好环境和侧栏折叠上下文里渲染名称为 "工作", 条目数为 3 的一行入口, 行尾带一个更多按钮.
 * @param options 折叠状态与选中状态.
 * @returns 选中回调的间谍与偏好环境.
 */
async function renderRow(options: RenderRowOptions): Promise<RenderedRow> {
  const environment = await createPreferencesTestEnvironment();
  const onSelect = vi.fn();
  render(
    <SidebarCollapseContext.Provider value={options.isCollapsed}>
      <ul>
        <SidebarNavItem
          label="工作"
          icon={<FolderIcon aria-hidden="true" />}
          count={3}
          isSelected={options.isSelected ?? false}
          onSelect={onSelect}
          actions={<Button>工作的更多操作</Button>}
        />
      </ul>
    </SidebarCollapseContext.Provider>,
    { wrapper: environment.Providers },
  );
  return { onSelect, environment };
}

/**
 * 等待悬停提示出现.
 * @param text 提示文字.
 * @returns 提示元素.
 */
function findTooltip(text: string): Promise<HTMLElement> {
  return screen.findByText(text, {}, { timeout: TOOLTIP_WAIT_MILLISECONDS });
}

describe("侧栏行入口: 展开态", () => {
  it("显示图标, 名称, 条目数和行尾操作, 文字容器占满剩余宽度", async () => {
    await renderRow({ isCollapsed: false });

    const row = screen.getByRole("listitem");
    const text = row.querySelector("[data-slot='sidebar-nav-item-text']");
    expectMotionClasses(text, COLLAPSIBLE_TEXT_STATE_CLASSES.expanded);
    expect(text?.classList.contains("grow-0")).toBe(false);
    expect(within(row).getByText("工作")).toBeDefined();
    expect(within(row).getByText("3")).toBeDefined();
    expect(
      within(row).getByRole("button", { name: "工作的更多操作" }),
    ).toBeDefined();
  });

  it("按钮名称是名称加条目数, 点击时通知调用方", async () => {
    const { onSelect } = await renderRow({ isCollapsed: false });

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: ROW_NAME }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("悬停时没有提示", async () => {
    await renderRow({ isCollapsed: false });
    const user = userEvent.setup();

    await user.hover(screen.getByRole("button", { name: ROW_NAME }));
    await act(
      () =>
        new Promise((resolve) =>
          setTimeout(resolve, TOOLTIP_SETTLE_MILLISECONDS),
        ),
    );

    expect(screen.queryByText(ROW_TOOLTIP)).toBeNull();
  });
});

describe("侧栏行入口: 折叠态的结构", () => {
  it("文字容器收窄并淡出但仍在, 行尾操作淡出且不可聚焦与点击", async () => {
    await renderRow({ isCollapsed: true });

    const row = screen.getByRole("listitem");
    const text = row.querySelector("[data-slot='sidebar-nav-item-text']");
    expectMotionClasses(text, COLLAPSIBLE_TEXT_STATE_CLASSES.collapsed);
    expect(text?.classList.contains("sr-only")).toBe(false);
    expect(text?.textContent).toBe("工作3");
    expect(within(row).getAllByRole("button")).toHaveLength(1);
    expect(
      within(row).queryByRole("button", { name: "工作的更多操作" }),
    ).toBeNull();
    const actionsBox = within(row)
      .getByText("工作的更多操作")
      .closest("[data-slot='collapsible-box']");
    expect(actionsBox?.getAttribute("data-state")).toBe("collapsed");
    expect(actionsBox?.hasAttribute("inert")).toBe(true);
    expect(actionsBox?.getAttribute("aria-hidden")).toBe("true");
  });

  it("按钮仍有无障碍名称, 图标格的起始侧外边距取折叠态居中所需的偏移", async () => {
    await renderRow({ isCollapsed: true });

    const button = screen.getByRole("button", { name: ROW_NAME });
    const iconCell = button.querySelector("svg")?.parentElement;
    expect(button.classList.contains("justify-start")).toBe(true);
    expect(iconCell?.classList.contains("ms-(--sidebar-row-icon-inset)")).toBe(
      true,
    );
    expect(iconCell?.classList.contains("ms-3")).toBe(false);
  });

  it("点击时仍通知调用方", async () => {
    const { onSelect } = await renderRow({ isCollapsed: true });

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: ROW_NAME }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe("侧栏行入口: 折叠态的提示", () => {
  it("悬停时在提示里显示名称和条目数, 移开后提示消失", async () => {
    await renderRow({ isCollapsed: true });
    const user = userEvent.setup();
    const button = screen.getByRole("button", { name: ROW_NAME });
    expect(screen.queryByText(ROW_TOOLTIP)).toBeNull();

    await user.hover(button);

    expect(await findTooltip(ROW_TOOLTIP)).toBeDefined();
    await user.unhover(button);
  });

  it("键盘聚焦时也显示提示", async () => {
    await renderRow({ isCollapsed: true });

    await userEvent.setup().tab();

    expect(await findTooltip(ROW_TOOLTIP)).toBeDefined();
  });

  it("界面切到英文后提示仍是 名称 (条目数) 的格式", async () => {
    const { environment } = await renderRow({ isCollapsed: true });
    await act(() => environment.i18n.changeLanguage("en"));

    await userEvent
      .setup()
      .hover(screen.getByRole("button", { name: ROW_NAME }));

    expect(await findTooltip(ROW_TOOLTIP)).toBeDefined();
  });
});

describe("侧栏行入口: 折叠态的选中状态", () => {
  it("选中的行保留底色与强调竖条, 当前项带 aria-current", async () => {
    await renderRow({ isCollapsed: true, isSelected: true });

    const row = screen.getByRole("listitem");
    expect(row.classList.contains("bg-muted")).toBe(true);
    expect(row.classList.contains("border-s-brand")).toBe(true);
    expect(
      screen
        .getByRole("button", { name: ROW_NAME })
        .getAttribute("aria-current"),
    ).toBe("true");
  });

  it("选中状态只用 aria-current 表达, 没有 aria-pressed", async () => {
    await renderRow({ isCollapsed: true, isSelected: true });

    const button = screen.getByRole("button", { name: ROW_NAME });
    expect(button.getAttribute("aria-current")).toBe("true");
    expect(button.hasAttribute("aria-pressed")).toBe(false);
  });
});
