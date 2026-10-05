import { describe, expect, it } from "vitest";

import { MAX_TAGS_PER_ENTRY } from "@shared/tags/tag-limits";
import { TAG_NAME_MAX_LENGTH } from "@shared/tags/tag-name-schema";

import { normalizeTagNames } from "./import-tag-names";

describe("规整来源的标签名", () => {
  it("去首尾空格, 丢掉空名与按同名规则重复的名称", () => {
    expect(
      normalizeTagNames([" 工作 ", "", "  ", "Work", "work", "工作"]),
    ).toEqual({ tagNames: ["工作", "Work"], losses: [] });
  });

  it("名称超过字符上限的带不进, 并记下标签名", () => {
    const tooLong = "长".repeat(TAG_NAME_MAX_LENGTH + 1);
    expect(normalizeTagNames(["正常", tooLong])).toEqual({
      tagNames: ["正常"],
      losses: [{ reason: "tag-name-invalid", fieldName: tooLong }],
    });
  });

  it("恰好等于上限的名称可以带入", () => {
    const atLimit = "长".repeat(TAG_NAME_MAX_LENGTH);
    expect(normalizeTagNames([atLimit]).tagNames).toEqual([atLimit]);
  });

  it("超过每个条目的标签上限时后面的带不进", () => {
    const names = Array.from(
      { length: MAX_TAGS_PER_ENTRY + 2 },
      (_value, index) => `标签${index}`,
    );
    const result = normalizeTagNames(names);
    expect(result.tagNames).toEqual(names.slice(0, MAX_TAGS_PER_ENTRY));
    expect(result.losses).toEqual([
      { reason: "tag-limit-exceeded", fieldName: `标签${MAX_TAGS_PER_ENTRY}` },
      {
        reason: "tag-limit-exceeded",
        fieldName: `标签${MAX_TAGS_PER_ENTRY + 1}`,
      },
    ]);
  });

  it("没有标签时结果为空", () => {
    expect(normalizeTagNames([])).toEqual({ tagNames: [], losses: [] });
  });
});
