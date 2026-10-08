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

  it("侧栏折叠时沿高度收起并淡出, 文字仍在无障碍树里, 读屏软件仍能读到", () => {
    render(
      <SidebarCollapseContext.Provider value={true}>
        <EmptyState message="还没有标签" />
      </SidebarCollapseContext.Provider>,
    );

    const message = screen.getByText("还没有标签");
    const box = message.closest("[data-slot='collapsible-box']");
    expect(message.classList.contains("sr-only")).toBe(false);
    expect(box?.getAttribute("data-state")).toBe("collapsed");
    expect(box?.classList.contains("h-0")).toBe(true);
    expect(box?.hasAttribute("inert")).toBe(false);
    expect(box?.hasAttribute("aria-hidden")).toBe(false);
  });
});
