import { describe, expect, it } from "vitest";

import {
  NO_CHECKED_IDS,
  checkAllVisible,
  checkRange,
  checkedVisibleIds,
  invertChecked,
  retainVisibleChecked,
  selectAllStateOf,
  toggleChecked,
  uncheckAllVisible,
} from "./batch-selection";

/**
 * 测试用的可见条目编号, 按显示顺序排列.
 */
const VISIBLE: readonly string[] = ["a", "b", "c", "d", "e"];

describe("toggleChecked", () => {
  it("没勾选的加入, 已勾选的取消, 不改动传入的集合", () => {
    const original = new Set(["a"]);

    const added = toggleChecked(original, "b");
    const removed = toggleChecked(original, "a");

    expect([...added]).toEqual(["a", "b"]);
    expect([...removed]).toEqual([]);
    expect([...original]).toEqual(["a"]);
  });
});

describe("checkRange", () => {
  it("勾选锚点与目标之间的全部可见条目, 并入已有的勾选", () => {
    const result = checkRange(new Set(["e"]), VISIBLE, "b", "d");

    expect([...result].sort()).toEqual(["b", "c", "d", "e"]);
  });

  it("目标在锚点之前时区间方向相反, 结果相同", () => {
    const result = checkRange(NO_CHECKED_IDS, VISIBLE, "d", "b");

    expect([...result].sort()).toEqual(["b", "c", "d"]);
  });

  it("没有锚点, 或锚点已不可见时只勾选目标", () => {
    expect([...checkRange(NO_CHECKED_IDS, VISIBLE, undefined, "c")]).toEqual([
      "c",
    ]);
    expect([...checkRange(NO_CHECKED_IDS, VISIBLE, "gone", "c")]).toEqual([
      "c",
    ]);
  });

  it("目标不在可见列表里时原样返回", () => {
    const checked = new Set(["a"]);

    expect(checkRange(checked, VISIBLE, "a", "gone")).toBe(checked);
  });
});

describe("全选与取消全选", () => {
  it("全选把可见条目并入已有勾选, 取消全选只去掉可见的", () => {
    const all = checkAllVisible(new Set(["z"]), ["a", "b"]);
    const none = uncheckAllVisible(all, ["a", "b"]);

    expect([...all].sort()).toEqual(["a", "b", "z"]);
    expect([...none]).toEqual(["z"]);
  });
});

describe("invertChecked", () => {
  it("可见条目里没勾选的变成勾选, 勾选的变成不勾选, 不可见的不保留", () => {
    const result = invertChecked(new Set(["a", "c", "gone"]), VISIBLE);

    expect([...result].sort()).toEqual(["b", "d", "e"]);
  });
});

describe("retainVisibleChecked", () => {
  it("取消不可见条目的勾选, 仍可见的保留", () => {
    const result = retainVisibleChecked(new Set(["a", "gone"]), VISIBLE);

    expect([...result]).toEqual(["a"]);
  });

  it("没有需要取消的条目时返回同一个集合", () => {
    const checked = new Set(["a", "b"]);

    expect(retainVisibleChecked(checked, VISIBLE)).toBe(checked);
  });
});

describe("checkedVisibleIds", () => {
  it("按显示顺序取出可见且已勾选的条目编号", () => {
    expect(checkedVisibleIds(new Set(["d", "b", "gone"]), VISIBLE)).toEqual([
      "b",
      "d",
    ]);
  });
});

describe("selectAllStateOf", () => {
  it("一个都没勾选是 none, 部分勾选是 some, 全部勾选是 all", () => {
    expect(selectAllStateOf(NO_CHECKED_IDS, VISIBLE)).toBe("none");
    expect(selectAllStateOf(new Set(["a"]), VISIBLE)).toBe("some");
    expect(selectAllStateOf(new Set(VISIBLE), VISIBLE)).toBe("all");
  });

  it("不可见的勾选不计入, 可见列表为空时是 none", () => {
    expect(selectAllStateOf(new Set(["gone"]), VISIBLE)).toBe("none");
    expect(selectAllStateOf(new Set(["a"]), [])).toBe("none");
  });
});
