import { describe, expect, it } from "vitest";

import { findHardcodedMotion } from "@renderer/testing/find-hardcoded-motion";
import {
  extractDurationTokens,
  readReducedMotionTokens,
  readTokenMilliseconds,
} from "@renderer/testing/motion-token-sheets";

import {
  COLLAPSE_BOX_AXIS_CLASSES,
  COLLAPSE_BOX_BASE_CLASSES,
  COLLAPSE_EXTENT_TRANSITION,
  COLLAPSE_FADE_CLASSES,
  COLLAPSE_FADE_TRANSITION,
  COLLAPSE_LAYER_CELL_CLASSES,
  COLLAPSE_LAYER_STACK_CLASSES,
  COLLAPSE_SPACE_TRANSITION,
  COLLAPSIBLE_TEXT_BASE_CLASSES,
  COLLAPSIBLE_TEXT_STATE_CLASSES,
  TOGGLE_ROW_ALIGNMENT_CLASSES,
  TOGGLE_ROW_SPACER_CLASSES,
} from "./collapse-motion";

/**
 * 全部折叠过渡的类名常量与名称, 状态表展开成各状态的类名.
 */
const COLLAPSE_CONSTANTS: readonly (readonly [string, string])[] = [
  ["COLLAPSE_EXTENT_TRANSITION", COLLAPSE_EXTENT_TRANSITION],
  ["COLLAPSE_SPACE_TRANSITION", COLLAPSE_SPACE_TRANSITION],
  ["COLLAPSE_FADE_TRANSITION", COLLAPSE_FADE_TRANSITION],
  ["COLLAPSE_FADE_CLASSES.expanded", COLLAPSE_FADE_CLASSES.expanded],
  ["COLLAPSE_FADE_CLASSES.collapsed", COLLAPSE_FADE_CLASSES.collapsed],
  ["COLLAPSE_BOX_BASE_CLASSES", COLLAPSE_BOX_BASE_CLASSES],
  ["COLLAPSE_BOX_AXIS_CLASSES.width", COLLAPSE_BOX_AXIS_CLASSES.width.expanded],
  ["COLLAPSE_BOX_AXIS_CLASSES.none", COLLAPSE_BOX_AXIS_CLASSES.none.expanded],
  ["COLLAPSE_LAYER_STACK_CLASSES", COLLAPSE_LAYER_STACK_CLASSES],
  ["COLLAPSE_LAYER_CELL_CLASSES", COLLAPSE_LAYER_CELL_CLASSES],
  ["COLLAPSIBLE_TEXT_BASE_CLASSES", COLLAPSIBLE_TEXT_BASE_CLASSES],
  [
    "COLLAPSIBLE_TEXT_STATE_CLASSES.expanded",
    COLLAPSIBLE_TEXT_STATE_CLASSES.expanded,
  ],
  ["TOGGLE_ROW_SPACER_CLASSES", TOGGLE_ROW_SPACER_CLASSES],
  [
    "TOGGLE_ROW_ALIGNMENT_CLASSES.expanded",
    TOGGLE_ROW_ALIGNMENT_CLASSES.expanded,
  ],
];

/**
 * 取出类名文本里 `delay-(--motion-*)` 引用的动效 token 名.
 * @param classNames 类名文本.
 * @returns 语义 token 名列表, 例如 `motion-fast-exit`.
 */
function extractDelayTokens(classNames: string): string[] {
  return Array.from(
    classNames.matchAll(/(?<![\w-])delay-\(--(motion-[\w-]+)\)/g),
    (match) => match[1],
  );
}

describe("折叠过渡常量的取值", () => {
  it.each(COLLAPSE_CONSTANTS)(
    "%s 没有写死的时长或曲线, 也没有任意值和 transition-all",
    (_name, classNames) => {
      expect(findHardcodedMotion(classNames)).toEqual([]);
      expect(classNames).not.toContain("transition-all");
      expect(classNames).not.toContain("-[");
    },
  );

  it("四个过渡常量的曲线取动效 token", () => {
    [
      COLLAPSE_EXTENT_TRANSITION,
      COLLAPSE_SPACE_TRANSITION,
      COLLAPSE_FADE_TRANSITION,
    ].forEach((classNames) =>
      expect(classNames.split(" ")).toContain("ease-(--motion-ease)"),
    );
    expect(TOGGLE_ROW_SPACER_CLASSES.split(" ")).toContain(
      "after:ease-(--motion-ease)",
    );
  });

  it("入口行后占位的三个过渡类名与空间过渡的三个类名一一对应, 只多 after: 前缀", () => {
    const prefixed = COLLAPSE_SPACE_TRANSITION.split(" ").map(
      (className) => `after:${className}`,
    );

    expect(prefixed).toHaveLength(3);
    expect(TOGGLE_ROW_SPACER_CLASSES.split(" ")).toEqual(
      expect.arrayContaining(prefixed),
    );
  });

  it("尺寸与空间过渡取基础档, 淡入淡出取快档, 入口行占位取基础档", () => {
    expect(extractDurationTokens(COLLAPSE_EXTENT_TRANSITION, "")).toEqual([
      "motion-base",
    ]);
    expect(extractDurationTokens(COLLAPSE_SPACE_TRANSITION, "")).toEqual([
      "motion-base",
    ]);
    expect(extractDurationTokens(COLLAPSE_FADE_TRANSITION, "")).toEqual([
      "motion-fast",
    ]);
    expect(extractDurationTokens(TOGGLE_ROW_SPACER_CLASSES, "after:")).toEqual([
      "motion-base",
    ]);
  });
});

describe("折叠过渡的节奏", () => {
  it("淡出没有延迟, 淡入延迟快档退出档", () => {
    expect(extractDelayTokens(COLLAPSE_FADE_CLASSES.collapsed)).toEqual([]);
    expect(extractDelayTokens(COLLAPSE_FADE_CLASSES.expanded)).toEqual([
      "motion-fast-exit",
    ]);
  });

  it("淡出比宽度收放快, 淡入的延迟比淡出时长短", () => {
    const fade = readTokenMilliseconds("motion-fast");

    expect(fade).toBeLessThan(readTokenMilliseconds("motion-base"));
    expect(readTokenMilliseconds("motion-fast-exit")).toBeLessThan(fade);
  });

  it("用到的时长与延迟 token 在减少动态效果下全部归零", () => {
    const tokens = [
      ...COLLAPSE_CONSTANTS.flatMap(([, classNames]) => [
        ...extractDurationTokens(classNames, ""),
        ...extractDurationTokens(classNames, "after:"),
        ...extractDelayTokens(classNames),
      ]),
    ];

    expect(tokens.length).toBeGreaterThan(0);
    expect(readReducedMotionTokens()).toEqual(expect.arrayContaining(tokens));
  });
});

describe("折叠过渡的状态类名", () => {
  it("沿宽度收放的盒子展开取自动宽度, 折叠取零, 不参与挤压; 尺寸不变的盒子两种状态都不设尺寸", () => {
    expect(COLLAPSE_BOX_AXIS_CLASSES.none.expanded).toBe("");
    expect(COLLAPSE_BOX_AXIS_CLASSES.none.collapsed).toBe("");
    expect(COLLAPSE_BOX_AXIS_CLASSES.width.expanded.split(" ")).toEqual(
      expect.arrayContaining(["w-auto", "shrink-0"]),
    );
    expect(COLLAPSE_BOX_AXIS_CLASSES.width.collapsed.split(" ")).toEqual(
      expect.arrayContaining(["w-0", "shrink-0"]),
    );
  });

  it("叠放容器是单列网格, 叠放的层都落在第一行第一列", () => {
    expect(COLLAPSE_LAYER_STACK_CLASSES).toBe("grid");
    expect(COLLAPSE_LAYER_CELL_CLASSES.split(" ")).toEqual([
      "col-start-1",
      "row-start-1",
    ]);
  });

  it("文字区展开占满剩余宽度并留间距, 折叠份额与间距归零", () => {
    expect(COLLAPSIBLE_TEXT_STATE_CLASSES.expanded.split(" ")).toEqual([
      "grow",
      "ms-2",
    ]);
    expect(COLLAPSIBLE_TEXT_STATE_CLASSES.collapsed.split(" ")).toEqual([
      "grow-0",
      "ms-0",
    ]);
    expect(COLLAPSIBLE_TEXT_BASE_CLASSES.split(" ")).toEqual(
      expect.arrayContaining(["basis-0", "min-w-0", "overflow-hidden"]),
    );
  });

  it("入口行折叠时后占位份额与前占位相等, 展开时为零", () => {
    expect(TOGGLE_ROW_ALIGNMENT_CLASSES.expanded).toBe("after:grow-0");
    expect(TOGGLE_ROW_ALIGNMENT_CLASSES.collapsed).toBe("after:grow");
    expect(TOGGLE_ROW_SPACER_CLASSES.split(" ")).toEqual(
      expect.arrayContaining([
        "before:grow",
        "before:basis-0",
        "after:basis-0",
      ]),
    );
  });
});
