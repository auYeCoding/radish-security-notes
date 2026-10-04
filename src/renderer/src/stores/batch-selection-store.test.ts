import { describe, expect, it } from "vitest";

import { createBatchSelectionStore } from "./batch-selection-store";

/**
 * 测试用的可见条目编号, 按显示顺序排列.
 */
const VISIBLE: readonly string[] = ["a", "b", "c", "d"];

describe("批量选中 store: 勾选与连选", () => {
  it("切换勾选, 并把被切换的条目记为连选起点", () => {
    const store = createBatchSelectionStore();

    store.getState().toggle("b");
    store.getState().toggle("c");
    store.getState().toggle("b");

    expect([...store.getState().checkedIds]).toEqual(["c"]);
    expect(store.getState().anchorId).toBe("b");
  });

  it("连选勾选起点与目标之间的全部可见条目, 起点保持不变", () => {
    const store = createBatchSelectionStore();
    store.getState().toggle("a");

    store.getState().checkRangeTo(VISIBLE, "c");
    store.getState().checkRangeTo(VISIBLE, "d");

    expect([...store.getState().checkedIds].sort()).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    expect(store.getState().anchorId).toBe("a");
  });

  it("没有起点, 或起点已不可见时只勾选目标并把它记为起点", () => {
    const store = createBatchSelectionStore();

    store.getState().checkRangeTo(VISIBLE, "c");
    expect([...store.getState().checkedIds]).toEqual(["c"]);
    expect(store.getState().anchorId).toBe("c");

    store.getState().toggle("gone");
    store.getState().checkRangeTo(VISIBLE, "a");
    expect([...store.getState().checkedIds].sort()).toEqual(["a", "c", "gone"]);
    expect(store.getState().anchorId).toBe("a");
  });
});

describe("批量选中 store: 全选, 反选与清空", () => {
  it("全选勾选全部可见条目, 全部勾选后再次全选取消它们", () => {
    const store = createBatchSelectionStore();
    store.getState().toggle("b");

    store.getState().toggleAll(VISIBLE);
    expect([...store.getState().checkedIds].sort()).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);

    store.getState().toggleAll(VISIBLE);
    expect([...store.getState().checkedIds]).toEqual([]);
  });

  it("反选只在可见条目里进行", () => {
    const store = createBatchSelectionStore();
    store.getState().toggle("a");
    store.getState().toggle("c");

    store.getState().invert(VISIBLE);

    expect([...store.getState().checkedIds].sort()).toEqual(["b", "d"]);
  });

  it("清空取消全部勾选并忘掉连选起点", () => {
    const store = createBatchSelectionStore();
    store.getState().toggle("a");

    store.getState().clear();

    expect(store.getState().checkedIds.size).toBe(0);
    expect(store.getState().anchorId).toBeUndefined();
  });
});

describe("批量选中 store: 取消不可见条目的选中", () => {
  it("只保留仍可见的勾选, 起点不可见时一并忘掉", () => {
    const store = createBatchSelectionStore();
    store.getState().toggle("a");
    store.getState().toggle("gone");

    store.getState().retain(VISIBLE);

    expect([...store.getState().checkedIds]).toEqual(["a"]);
    expect(store.getState().anchorId).toBeUndefined();
  });

  it("没有需要取消的勾选时状态对象不变, 订阅者不会收到通知", () => {
    const store = createBatchSelectionStore();
    store.getState().toggle("a");
    const before = store.getState();

    store.getState().retain(VISIBLE);

    expect(store.getState()).toBe(before);
  });
});
