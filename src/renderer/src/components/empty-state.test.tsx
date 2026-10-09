import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./empty-state";
import { SidebarCollapseContext } from "./sidebar-collapse-context";

describe("空状态说明", () => {
  it("默认显示一行辅助文字", () => {
    render(<EmptyState message="还没有标签" />);

    const message = screen.getByText("还没有标签");
    expect(message.classList.contains("sr-only")).toBe(false);
    expect(message.classList.contains("text-muted-foreground")).toBe(true);
    expect(
      message
        .closest("[data-slot='collapsible-box']")
        ?.getAttribute("data-state"),
    ).toBe("expanded");
  });

  it("侧栏折叠时只淡出, 仍占着展开时的高度, 文字仍在无障碍树里, 读屏软件仍能读到", () => {
    render(
      <SidebarCollapseContext.Provider value={true}>
        <EmptyState message="还没有标签" />
      </SidebarCollapseContext.Provider>,
    );

    const message = screen.getByText("还没有标签");
    const box = message.closest("[data-slot='collapsible-box']");
    expect(message.classList.contains("sr-only")).toBe(false);
    expect(box?.getAttribute("data-state")).toBe("collapsed");
    expect(box?.classList.contains("h-0")).toBe(false);
    expect(box?.classList.contains("h-auto")).toBe(false);
    expect(box?.hasAttribute("inert")).toBe(false);
    expect(box?.hasAttribute("aria-hidden")).toBe(false);
  });

  it("文字始终按展开宽度排版, 折叠与过渡中不重新换行", () => {
    render(
      <SidebarCollapseContext.Provider value={true}>
        <EmptyState message="还没有标签" />
      </SidebarCollapseContext.Provider>,
    );

    const content = screen
      .getByText("还没有标签")
      .closest("[data-slot='collapsible-box']")?.firstElementChild;
    expect(content?.classList.contains("w-(--sidebar-width)")).toBe(true);
  });
});

describe("空状态说明的结构", () => {
  it("折叠时没有占位图标, 只有说明文字一块, 不带叠放容器", () => {
    render(
      <SidebarCollapseContext.Provider value={true}>
        <EmptyState message="还没有文件夹" />
      </SidebarCollapseContext.Provider>,
    );

    const box = screen
      .getByText("还没有文件夹")
      .closest("[data-slot='collapsible-box']");
    expect(
      document.querySelectorAll("[data-slot='collapsible-box']"),
    ).toHaveLength(1);
    expect(document.querySelector("svg")).toBeNull();
    expect(box?.parentElement?.classList.contains("grid")).toBe(false);
  });
});
