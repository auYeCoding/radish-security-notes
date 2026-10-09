import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  expectMotionClasses,
  expectNoClassContaining,
} from "@renderer/testing/expect-motion-classes";

import { CollapsibleBox } from "./collapsible-box";
import {
  COLLAPSE_BOX_AXIS_CLASSES,
  COLLAPSE_BOX_BASE_CLASSES,
  COLLAPSE_FADE_CLASSES,
  COLLAPSE_FADE_TRANSITION,
} from "./ui/collapse-motion";

/**
 * 沿宽度收放的盒子才会带的尺寸类名片段, 尺寸不变的盒子不应出现.
 */
const SIZE_CLASS_FRAGMENTS: readonly string[] = [
  "w-0",
  "w-auto",
  "h-0",
  "h-auto",
];

/**
 * 取出渲染结果里的盒子外层元素.
 * @returns 外层元素.
 */
function getBox(): HTMLElement {
  const box = screen.getByText("内容").closest("[data-slot='collapsible-box']");
  if (!(box instanceof HTMLElement)) {
    throw new Error("没有找到可折叠盒子");
  }
  return box;
}

describe("可折叠盒子: 展开", () => {
  it("尺寸不变时展开: 外层不设尺寸, 内层不透明, 可被读屏软件读到", () => {
    render(
      <CollapsibleBox isExpanded={true} axis="none">
        内容
      </CollapsibleBox>,
    );

    const box = getBox();
    expect(box.dataset.state).toBe("expanded");
    expectMotionClasses(box, COLLAPSE_BOX_BASE_CLASSES);
    expectNoClassContaining(box, SIZE_CLASS_FRAGMENTS);
    expect(box.hasAttribute("inert")).toBe(false);
    expect(box.hasAttribute("aria-hidden")).toBe(false);
    const content = box.firstElementChild;
    expectMotionClasses(content, COLLAPSE_FADE_TRANSITION);
    expectMotionClasses(content, COLLAPSE_FADE_CLASSES.expanded);
  });

  it("沿宽度展开时外层取自动宽度且不参与挤压", () => {
    render(
      <CollapsibleBox isExpanded={true} axis="width">
        内容
      </CollapsibleBox>,
    );

    expectMotionClasses(getBox(), COLLAPSE_BOX_AXIS_CLASSES.width.expanded);
  });
});

describe("可折叠盒子: 折叠", () => {
  it("尺寸不变时折叠: 外层不设尺寸, 内层透明, 默认不可聚焦也不可读", () => {
    render(
      <CollapsibleBox isExpanded={false} axis="none">
        内容
      </CollapsibleBox>,
    );

    const box = getBox();
    expect(box.dataset.state).toBe("collapsed");
    expectMotionClasses(box, COLLAPSE_BOX_BASE_CLASSES);
    expectNoClassContaining(box, SIZE_CLASS_FRAGMENTS);
    expect(box.hasAttribute("inert")).toBe(true);
    expect(box.getAttribute("aria-hidden")).toBe("true");
    expectMotionClasses(box.firstElementChild, COLLAPSE_FADE_CLASSES.collapsed);
  });

  it("沿宽度折叠时外层取零宽度", () => {
    render(
      <CollapsibleBox isExpanded={false} axis="width">
        内容
      </CollapsibleBox>,
    );

    expectMotionClasses(getBox(), COLLAPSE_BOX_AXIS_CLASSES.width.collapsed);
  });
});

describe("可折叠盒子: 折叠后的可访问性与追加类名", () => {
  it("不要求隐藏时折叠后仍可被读屏软件读到", () => {
    render(
      <CollapsibleBox
        isExpanded={false}
        axis="none"
        isHiddenWhenCollapsed={false}
      >
        内容
      </CollapsibleBox>,
    );

    const box = getBox();
    expect(box.hasAttribute("inert")).toBe(false);
    expect(box.hasAttribute("aria-hidden")).toBe(false);
  });

  it("追加的内层类名与淡入淡出类名并存", () => {
    render(
      <CollapsibleBox
        isExpanded={false}
        axis="none"
        contentClassName="flex items-center"
      >
        内容
      </CollapsibleBox>,
    );

    expectMotionClasses(
      getBox().firstElementChild,
      `flex items-center ${COLLAPSE_FADE_CLASSES.collapsed}`,
    );
  });

  it("追加的外层类名与尺寸类名并存", () => {
    render(
      <CollapsibleBox
        isExpanded={true}
        axis="width"
        className="col-start-1 row-start-1"
      >
        内容
      </CollapsibleBox>,
    );

    expectMotionClasses(
      getBox(),
      `${COLLAPSE_BOX_AXIS_CLASSES.width.expanded} col-start-1 row-start-1`,
    );
  });
});
