import { describe, expect, it } from "vitest";

import { findHardcodedMotion } from "./find-hardcoded-motion";

/**
 * 应被判为写死动效取值的样例与应命中的片段.
 */
const HARDCODED_SAMPLES: readonly (readonly [string, string])[] = [
  ["data-open:duration-100", "duration-100"],
  ["animation-duration-300", "animation-duration-300"],
  ["delay-150", "delay-150"],
  ["duration-[120ms]", "duration-[120ms]"],
  ["ease-[cubic-bezier(0.4,0,0.2,1)]", "ease-[cubic-bezier(0.4,0,0.2,1)]"],
  ["transition ease-in-out", "ease-in-out"],
  ["ease-out", "ease-out"],
  ["cubic-bezier(0.2, 0, 0, 1)", "cubic-bezier("],
  ["transition: color 0.2s ease;", "transition: color 0.2s"],
  ["transition-duration: 150ms;", "transition-duration: 150ms"],
  ["animation: enter 1s;", "animation: enter 1s"],
  ["--motion-fast: 120ms;", "--motion-fast: 120ms"],
];

/**
 * 取自动效 token, 不应被判为写死的样例.
 */
const TOKEN_SAMPLES: readonly string[] = [
  "duration-(--motion-fast) ease-(--motion-ease)",
  "data-closed:duration-(--motion-base-exit)",
  "transition-colors transition-transform",
  "transition: color var(--motion-fast) var(--motion-ease);",
  "--motion-fast: var(--duration-fast);",
  "const durationMilliseconds = 3000;",
  "animate-in fade-in-0 zoom-in-95",
];

describe("findHardcodedMotion", () => {
  it.each(HARDCODED_SAMPLES)("%s 被判为写死的取值", (sample, expected) => {
    expect(findHardcodedMotion(sample)).toContain(expected);
  });

  it.each(TOKEN_SAMPLES)("%s 不被判为写死的取值", (sample) => {
    expect(findHardcodedMotion(sample)).toEqual([]);
  });
});
