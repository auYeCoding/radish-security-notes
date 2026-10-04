import { describe, expect, it } from "vitest";

import { MAX_TAGS_PER_ENTRY } from "../tags/tag-limits";
import { appendTagId, wouldExceedTagLimit } from "./tag-append";

/**
 * 生成带满上限个标签的标签编号.
 * @returns 标签编号列表.
 */
function fullTagIds(): readonly string[] {
  return Array.from({ length: MAX_TAGS_PER_ENTRY }, (_, index) => `t-${index}`);
}

describe("appendTagId", () => {
  it("没带的标签追加在末尾, 已带的原样返回", () => {
    const own = ["a", "b"];

    expect(appendTagId(own, "c")).toEqual(["a", "b", "c"]);
    expect(appendTagId(own, "a")).toBe(own);
    expect(own).toEqual(["a", "b"]);
  });
});

describe("wouldExceedTagLimit", () => {
  it("已带满上限个标签时追加新标签会超限, 追加已带的不算超限", () => {
    const own = fullTagIds();

    expect(wouldExceedTagLimit(own, "new")).toBe(true);
    expect(wouldExceedTagLimit(own, "t-0")).toBe(false);
  });

  it("没带满时追加不超限", () => {
    expect(wouldExceedTagLimit(fullTagIds().slice(1), "new")).toBe(false);
    expect(wouldExceedTagLimit([], "new")).toBe(false);
  });
});
