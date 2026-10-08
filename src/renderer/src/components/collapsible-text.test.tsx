import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectMotionClasses } from "@renderer/testing/expect-motion-classes";

import { CollapsibleText } from "./collapsible-text";
import { Button } from "./ui/button";
import {
  COLLAPSE_FADE_CLASSES,
  COLLAPSE_FADE_TRANSITION,
  COLLAPSIBLE_TEXT_BASE_CLASSES,
  COLLAPSIBLE_TEXT_STATE_CLASSES,
} from "./ui/collapse-motion";

/**
 * 渲染一个文字区.
 * @param isCollapsed 所在区域是否折叠.
 * @returns 文字区外层元素.
 */
function renderText(isCollapsed: boolean): HTMLElement {
  render(
    <Button>
      <CollapsibleText
        slot="demo-text"
        isCollapsed={isCollapsed}
        stateClasses={COLLAPSIBLE_TEXT_STATE_CLASSES}
        contentClassName="flex items-center"
      >
        文字
      </CollapsibleText>
    </Button>,
  );
  const outer = screen.getByText("文字").parentElement;
  if (outer === null) {
    throw new Error("没有找到文字区外层");
  }
  return outer;
}

describe("可折叠文字区", () => {
  it("展开时外层占满剩余宽度, 内层不透明", () => {
    const outer = renderText(false);

    expect(outer.dataset.slot).toBe("demo-text");
    expectMotionClasses(outer, COLLAPSIBLE_TEXT_BASE_CLASSES);
    expectMotionClasses(outer, COLLAPSIBLE_TEXT_STATE_CLASSES.expanded);
    const content = screen.getByText("文字");
    expectMotionClasses(content, COLLAPSE_FADE_TRANSITION);
    expectMotionClasses(content, COLLAPSE_FADE_CLASSES.expanded);
    expectMotionClasses(content, "flex items-center");
  });

  it("折叠时外层份额归零, 内层透明, 文字仍是按钮的无障碍名称", () => {
    const outer = renderText(true);

    expectMotionClasses(outer, COLLAPSIBLE_TEXT_STATE_CLASSES.collapsed);
    expectMotionClasses(
      screen.getByText("文字"),
      COLLAPSE_FADE_CLASSES.collapsed,
    );
    expect(outer.hasAttribute("aria-hidden")).toBe(false);
    expect(outer.hasAttribute("inert")).toBe(false);
    expect(screen.getByRole("button", { name: "文字" })).toBeDefined();
  });
});
