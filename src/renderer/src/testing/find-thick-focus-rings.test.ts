import { describe, expect, it } from "vitest";

import { findThickFocusRings } from "./find-thick-focus-rings";

/**
 * 应被判为聚焦或错误外圈的样例与应命中的片段.
 */
const THICK_RING_SAMPLES: readonly (readonly [string, string])[] = [
  ["focus-visible:ring-3", "focus-visible:ring-3"],
  ["focus-visible:ring-[3px]", "focus-visible:ring-[3px]"],
  ["focus-visible:ring-ring/50", "focus-visible:ring-ring/50"],
  ["focus-within:ring-ring/50", "focus-within:ring-ring/50"],
  ["aria-invalid:ring-3", "aria-invalid:ring-3"],
  ["aria-invalid:ring-destructive/20", "aria-invalid:ring-destructive/20"],
  [
    "dark:has-aria-invalid:ring-destructive/40",
    "dark:has-aria-invalid:ring-destructive/40",
  ],
  [
    "has-[[data-slot][aria-invalid=true]]:ring-3",
    "has-[[data-slot][aria-invalid=true]]:ring-3",
  ],
  ["ring-3", "ring-3"],
];

/**
 * 不应被判为聚焦或错误外圈的样例: 边框变色, 轮廓, 状态之外的细外圈, 与外圈无关的文字.
 */
const ALLOWED_SAMPLES: readonly string[] = [
  "focus-visible:border-ring",
  "aria-invalid:border-destructive",
  "focus-visible:outline-1 focus-visible:outline-solid focus-visible:outline-offset-2",
  "focus-visible:outline-destructive!",
  "group-has-[:focus-visible]/field-label:outline-0",
  "bg-accent ring-1 ring-brand ring-inset",
  "ring-0",
  "const string = 'ring';",
];

describe("findThickFocusRings", () => {
  it.each(THICK_RING_SAMPLES)("%s 被判为聚焦或错误外圈", (sample, expected) => {
    expect(findThickFocusRings(sample)).toContain(expected);
  });

  it.each(ALLOWED_SAMPLES)("%s 不被判为聚焦或错误外圈", (sample) => {
    expect(findThickFocusRings(sample)).toEqual([]);
  });
});
