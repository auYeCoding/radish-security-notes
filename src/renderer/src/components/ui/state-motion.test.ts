import { describe, expect, it } from "vitest";

import { findHardcodedMotion } from "@renderer/testing/find-hardcoded-motion";
import {
  extractDurationTokens,
  readReducedMotionTokens,
  readTokenMilliseconds,
} from "@renderer/testing/motion-token-sheets";

import {
  BASE_STATE_TRANSITION,
  BASE_TRANSFORM_TRANSITION,
  FADE_IN_MOTION,
  FAST_STATE_TRANSITION,
  MARK_TRANSITION,
} from "./state-motion";

/**
 * 全部状态过渡常量与名称.
 */
const STATE_CONSTANTS: readonly (readonly [string, string])[] = [
  ["FAST_STATE_TRANSITION", FAST_STATE_TRANSITION],
  ["BASE_STATE_TRANSITION", BASE_STATE_TRANSITION],
  ["BASE_TRANSFORM_TRANSITION", BASE_TRANSFORM_TRANSITION],
  ["MARK_TRANSITION", MARK_TRANSITION],
  ["FADE_IN_MOTION", FADE_IN_MOTION],
];

describe("状态过渡常量", () => {
  it.each(STATE_CONSTANTS)("%s 没有写死的时长或曲线", (_name, classNames) => {
    expect(findHardcodedMotion(classNames)).toEqual([]);
  });

  it.each(STATE_CONSTANTS)("%s 的曲线取动效 token", (_name, classNames) => {
    expect(classNames.split(" ")).toContain("ease-(--motion-ease)");
  });

  it("快档状态和标记取快档, 开关取基础档", () => {
    expect(extractDurationTokens(FAST_STATE_TRANSITION, "")).toEqual([
      "motion-fast",
    ]);
    expect(extractDurationTokens(MARK_TRANSITION, "")).toEqual(["motion-fast"]);
    expect(extractDurationTokens(FADE_IN_MOTION, "")).toEqual(["motion-fast"]);
    expect(extractDurationTokens(BASE_STATE_TRANSITION, "")).toEqual([
      "motion-base",
    ]);
    expect(extractDurationTokens(BASE_TRANSFORM_TRANSITION, "")).toEqual([
      "motion-base",
    ]);
  });

  it("开关滑块只过渡位移, 其它状态用默认属性集合", () => {
    expect(BASE_TRANSFORM_TRANSITION.split(" ")).toContain(
      "transition-transform",
    );
    expect(FAST_STATE_TRANSITION.split(" ")).toContain("transition");
    expect(FAST_STATE_TRANSITION.split(" ")).not.toContain("transition-all");
  });

  it("标记出现时淡入并缩放, 消失时反向", () => {
    expect(MARK_TRANSITION.split(" ")).toEqual(
      expect.arrayContaining([
        "data-starting-style:scale-90",
        "data-starting-style:opacity-0",
        "data-ending-style:scale-90",
        "data-ending-style:opacity-0",
      ]),
    );
  });

  it("用到的时长 token 在减少动态效果下全部归零, 基础档比快档长", () => {
    const tokens = STATE_CONSTANTS.flatMap(([, classNames]) =>
      extractDurationTokens(classNames, ""),
    );

    expect(readReducedMotionTokens()).toEqual(expect.arrayContaining(tokens));
    expect(readTokenMilliseconds("motion-base")).toBeGreaterThan(
      readTokenMilliseconds("motion-fast"),
    );
  });
});

describe("淡入常量", () => {
  it("只改透明度, 不位移不缩放, 用进入动画而不是过渡", () => {
    const classNames = FADE_IN_MOTION.split(" ");

    expect(classNames).toEqual(
      expect.arrayContaining(["animate-in", "fade-in-0"]),
    );
    expect(
      classNames.filter((name) => /zoom|slide|translate/.test(name)),
    ).toEqual([]);
  });

  it("时长取快档, 不是过渡类", () => {
    expect(FADE_IN_MOTION.split(" ")).not.toContain("transition");
    expect(extractDurationTokens(FADE_IN_MOTION, "")).toEqual(["motion-fast"]);
  });
});
