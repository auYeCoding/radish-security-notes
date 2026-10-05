import { describe, expect, it } from "vitest";

import type { CustomEntryTypeFieldPlan } from "./custom-entry-type-field-plan";
import {
  hasStoredValue,
  isEntryRewriteNeeded,
  remapEntryFieldValues,
} from "./custom-entry-type-value-remap";

/**
 * 构造字段计划, 只带改写取值用到的保留对照与被删键.
 * @param kept 保留字段的新旧键对照.
 * @param removedKeys 被删字段的键.
 * @returns 字段计划.
 */
function planOf(
  kept: ReadonlyArray<readonly [string, string]>,
  removedKeys: readonly string[] = [],
): CustomEntryTypeFieldPlan {
  return { fields: [], keptKeys: new Map(kept), removedKeys };
}

describe("isEntryRewriteNeeded", () => {
  it("键都不变且没有被删字段时不需要改写", () => {
    expect(isEntryRewriteNeeded(planOf([["a", "a"]]))).toBe(false);
  });

  it("有被删字段或有换键的字段时需要改写", () => {
    expect(isEntryRewriteNeeded(planOf([["a", "a"]], ["b"]))).toBe(true);
    expect(isEntryRewriteNeeded(planOf([["a", "account"]]))).toBe(true);
  });
});

describe("remapEntryFieldValues", () => {
  it("保留字段的取值按新键保留, 被删字段的取值与过期键都不再保留", () => {
    const plan = planOf([["field-a", "field-a"]], ["field-b"]);

    expect(
      remapEntryFieldValues(
        { "field-a": "甲", "field-b": "乙", "field-stale": "过期" },
        plan,
      ),
    ).toEqual({ "field-a": "甲" });
  });

  it("两个字段互换键时取值互不覆盖", () => {
    const plan = planOf([
      ["account", "field-x"],
      ["field-x", "account"],
    ]);

    expect(
      remapEntryFieldValues({ account: "旧摘要", "field-x": "新摘要" }, plan),
    ).toEqual({ "field-x": "旧摘要", account: "新摘要" });
  });

  it("原摘要字段被删, 另一个字段成为摘要时, account 里是新摘要字段的取值", () => {
    const plan = planOf([["field-p", "account"]], ["account"]);

    expect(
      remapEntryFieldValues(
        { account: "被删的值", "field-p": "迁入的值" },
        plan,
      ),
    ).toEqual({ account: "迁入的值" });
  });

  it("条目没有存过的键不会凭空出现", () => {
    expect(remapEntryFieldValues({}, planOf([["field-a", "account"]]))).toEqual(
      {},
    );
  });
});

describe("hasStoredValue", () => {
  it("任何一个条目在给定键上有非空值时为 true", () => {
    expect(hasStoredValue([{ a: "" }, { a: "值" }], ["a"])).toBe(true);
  });

  it("值都是空串或没有存过, 或键列表为空时为 false", () => {
    expect(hasStoredValue([{ a: "" }, {}], ["a"])).toBe(false);
    expect(hasStoredValue([{ a: "值" }], [])).toBe(false);
    expect(hasStoredValue([], ["a"])).toBe(false);
  });
});
