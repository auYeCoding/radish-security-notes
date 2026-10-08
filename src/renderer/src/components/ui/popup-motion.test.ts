import { describe, expect, it } from "vitest";

import { findHardcodedMotion } from "@renderer/testing/find-hardcoded-motion";
import {
  extractDurationTokens,
  readReducedMotionTokens,
  readTokenMilliseconds,
} from "@renderer/testing/motion-token-sheets";

import {
  ANCHORED_POPUP_MOTION,
  MODAL_POPUP_MOTION,
  OVERLAY_MOTION,
} from "./popup-motion";

/**
 * 全部浮层动画常量与名称.
 */
const POPUP_CONSTANTS: readonly (readonly [string, string])[] = [
  ["OVERLAY_MOTION", OVERLAY_MOTION],
  ["MODAL_POPUP_MOTION", MODAL_POPUP_MOTION],
  ["ANCHORED_POPUP_MOTION", ANCHORED_POPUP_MOTION],
];

/**
 * 进入与退出都淡入淡出的类名.
 */
const FADE_CLASSES = [
  "data-open:animate-in",
  "data-open:fade-in-0",
  "data-closed:animate-out",
  "data-closed:fade-out-0",
];

describe("浮层动画常量", () => {
  it.each(POPUP_CONSTANTS)("%s 没有写死的时长或曲线", (_name, classNames) => {
    expect(findHardcodedMotion(classNames)).toEqual([]);
  });

  it.each(POPUP_CONSTANTS)("%s 淡入淡出且曲线取 token", (_name, classNames) => {
    expect(classNames.split(" ")).toEqual(
      expect.arrayContaining([...FADE_CLASSES, "ease-(--motion-ease)"]),
    );
  });

  it("遮罩只淡入淡出, 不缩放也不滑入", () => {
    expect(OVERLAY_MOTION).not.toContain("zoom");
    expect(OVERLAY_MOTION).not.toContain("slide");
  });

  it.each([
    ["MODAL_POPUP_MOTION", MODAL_POPUP_MOTION],
    ["ANCHORED_POPUP_MOTION", ANCHORED_POPUP_MOTION],
  ])("%s 由 95% 缩放到 100%, 不滑入", (_name, classNames) => {
    expect(classNames.split(" ")).toEqual(
      expect.arrayContaining([
        "data-open:zoom-in-95",
        "data-closed:zoom-out-95",
      ]),
    );
    expect(classNames).not.toContain("slide");
  });
});

describe("浮层动画常量的时长", () => {
  it("对话框与遮罩用基础档, 锚点浮层用快档", () => {
    expect(extractDurationTokens(OVERLAY_MOTION, "data-open:")).toEqual([
      "motion-base",
    ]);
    expect(extractDurationTokens(MODAL_POPUP_MOTION, "data-open:")).toEqual([
      "motion-base",
    ]);
    expect(extractDurationTokens(ANCHORED_POPUP_MOTION, "data-open:")).toEqual([
      "motion-fast",
    ]);
  });

  it.each(POPUP_CONSTANTS)("%s 的退出时长比进入时长短", (_name, classNames) => {
    const [enterToken] = extractDurationTokens(classNames, "data-open:");
    const [exitToken] = extractDurationTokens(classNames, "data-closed:");

    expect(exitToken).toBe(`${enterToken}-exit`);
    expect(readTokenMilliseconds(exitToken)).toBeLessThan(
      readTokenMilliseconds(enterToken),
    );
  });

  it("用到的进入与退出时长 token 在减少动态效果下全部归零", () => {
    const tokens = POPUP_CONSTANTS.flatMap(([, classNames]) => [
      ...extractDurationTokens(classNames, "data-open:"),
      ...extractDurationTokens(classNames, "data-closed:"),
    ]);

    expect(readReducedMotionTokens()).toEqual(expect.arrayContaining(tokens));
  });
});
