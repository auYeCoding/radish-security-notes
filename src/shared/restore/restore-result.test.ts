import { describe, expect, it } from "vitest";

import { restoreProblem } from "./restore-problem";
import { restoreFailed, restoreSucceeded } from "./restore-result";

describe("恢复操作的结果", () => {
  it("成功带值", () => {
    expect(restoreSucceeded({ entryCount: 1 })).toEqual({
      ok: true,
      value: { entryCount: 1 },
    });
  });

  it("失败带原因, 没有问题时不带 problem 键", () => {
    expect(restoreFailed("busy")).toEqual({ ok: false, reason: "busy" });
    expect("problem" in restoreFailed("busy")).toBe(false);
  });

  it("内容不合规的失败带第一个问题", () => {
    expect(
      restoreFailed(
        "invalid-content",
        restoreProblem("entries", "unknown-reference", 3),
      ),
    ).toEqual({
      ok: false,
      reason: "invalid-content",
      problem: { section: "entries", code: "unknown-reference", position: 3 },
    });
  });
});

describe("校验问题", () => {
  it("与具体某项无关时不带位置", () => {
    expect(restoreProblem("manifest", "count-mismatch")).toEqual({
      section: "manifest",
      code: "count-mismatch",
    });
    expect("position" in restoreProblem("manifest", "count-mismatch")).toBe(
      false,
    );
  });

  it("带位置时位置是区段里第几项", () => {
    expect(restoreProblem("tags", "duplicate-name", 2)).toEqual({
      section: "tags",
      code: "duplicate-name",
      position: 2,
    });
  });
});
