import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TitleBar } from "./title-bar";

/**
 * 渲染带两个槽位内容的标题栏.
 * @returns 标题栏元素.
 */
function renderTitleBar(): HTMLElement {
  render(<TitleBar leading={<span>左侧</span>} trailing={<span>右侧</span>} />);
  return document.querySelector<HTMLElement>("[data-slot='title-bar']")!;
}

describe("TitleBar", () => {
  it("左侧槽在前, 右侧槽在后", () => {
    const titleBar = renderTitleBar();

    const texts = Array.from(titleBar.children).map(
      (child) => child.textContent,
    );
    expect(texts).toEqual(["左侧", "右侧"]);
  });

  it("整条标为拖动区域", () => {
    const titleBar = renderTitleBar();

    expect(titleBar.classList.contains("app-region-drag")).toBe(true);
  });

  it("高度取标题栏高度 token, 颜色取自侧栏的语义 token", () => {
    const titleBar = renderTitleBar();

    expect(titleBar.classList.contains("h-(--titlebar-height)")).toBe(true);
    expect(titleBar.classList.contains("bg-sidebar")).toBe(true);
    expect(titleBar.classList.contains("text-sidebar-foreground")).toBe(true);
    expect(titleBar.classList.contains("border-sidebar-border")).toBe(true);
  });

  it("打印时隐藏", () => {
    const titleBar = renderTitleBar();

    expect(titleBar.classList.contains("print:hidden")).toBe(true);
  });

  it("不是 banner 角色, 不与三栏界面的顶栏争用这个角色", () => {
    renderTitleBar();

    expect(screen.queryByRole("banner")).toBeNull();
  });
});
