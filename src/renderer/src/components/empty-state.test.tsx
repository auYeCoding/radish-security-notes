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
  });

  it("侧栏折叠时文字改为屏幕外隐藏, 读屏软件仍能读到", () => {
    render(
      <SidebarCollapseContext.Provider value={true}>
        <EmptyState message="还没有标签" />
      </SidebarCollapseContext.Provider>,
    );

    const message = screen.getByText("还没有标签");
    expect(message.classList.contains("sr-only")).toBe(true);
    expect(message.classList.contains("text-muted-foreground")).toBe(false);
  });
});
