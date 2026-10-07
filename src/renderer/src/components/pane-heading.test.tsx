import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PaneHeading } from "./pane-heading";
import { SidebarCollapseContext } from "./sidebar-collapse-context";
import { Button } from "./ui/button";

/**
 * 渲染带辅助内容和新建按钮的分区标题.
 * @param isCollapsed 侧栏是否折叠, 不给时不在侧栏折叠上下文里.
 */
function renderHeading(isCollapsed?: boolean): void {
  const heading = (
    <PaneHeading title="标签" trailing="3" action={<Button>新建标签</Button>} />
  );
  render(
    isCollapsed === undefined ? (
      heading
    ) : (
      <SidebarCollapseContext.Provider value={isCollapsed}>
        {heading}
      </SidebarCollapseContext.Provider>
    ),
  );
}

describe("窗格标题", () => {
  it("不在侧栏折叠上下文里时显示标题, 辅助内容和操作", () => {
    renderHeading();

    expect(screen.getByRole("heading", { name: "标签" })).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByRole("button", { name: "新建标签" })).toBeDefined();
    expect(screen.queryByRole("separator")).toBeNull();
  });

  it("侧栏展开时显示标题, 辅助内容和操作", () => {
    renderHeading(false);

    expect(screen.getByRole("heading", { name: "标签" })).toBeDefined();
    expect(screen.getByRole("button", { name: "新建标签" })).toBeDefined();
    expect(screen.queryByRole("separator")).toBeNull();
  });

  it("侧栏折叠时不显示标题文字, 辅助内容和操作, 只留一条分隔线", () => {
    renderHeading(true);

    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByText("标签")).toBeNull();
    expect(screen.queryByText("3")).toBeNull();
    expect(screen.queryByRole("button", { name: "新建标签" })).toBeNull();
    expect(screen.getAllByRole("separator")).toHaveLength(1);
  });
});
