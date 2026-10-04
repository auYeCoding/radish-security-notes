import { describe, expect, it, vi } from "vitest";

import type { BatchBridge } from "@shared/batch/batch-bridge";
import { MAX_TAGS_PER_ENTRY } from "@shared/tags/tag-limits";
import type { EntryDetail } from "@shared/entries/entry-types";

import { FORUM_ENTRY } from "@renderer/testing/entry-fixtures";
import { createFakeBatchBridge } from "@renderer/testing/fake-batch-bridge";
import { createFakeEntryBridge } from "@renderer/testing/fake-entry-bridge";

import {
  createBatchOperations,
  type BatchOperations,
} from "./batch-operations";
import { createEntryStore, type EntryStore } from "./entry-store";

/**
 * 一次批量操作测试用的环境.
 */
interface OperationsHarness {
  /**
   * 被测的批量操作.
   */
  readonly operations: BatchOperations;
  /**
   * 条目 store.
   */
  readonly store: EntryStore;
  /**
   * 清空批量选中的间谍.
   */
  readonly clearChecked: ReturnType<typeof vi.fn<() => void>>;
  /**
   * 假批量桥.
   */
  readonly bridge: BatchBridge;
  /**
   * 假条目桥里读取列表的间谍.
   */
  readonly list: () => Promise<unknown>;
  /**
   * 假桥共享的条目数据, 测试可以直接改它来模拟数据库里的变化.
   */
  readonly details: EntryDetail[];
}

/**
 * 生成一个条目详情: 在论坛条目的基础上换编号与名称.
 * @param id 条目编号.
 * @param extra 要覆盖的其它字段.
 * @returns 条目详情.
 */
function entryOf(id: string, extra: Partial<EntryDetail> = {}): EntryDetail {
  return { ...FORUM_ENTRY, id, name: id.toUpperCase(), ...extra };
}

/**
 * 创建批量操作测试环境: 条目 store 已读取三个条目 a, b, c, 假批量桥与假条目桥共享数据.
 * @param bridgeOverrides 覆盖假批量桥上的方法.
 * @param details 三个条目的详情.
 * @returns 测试环境.
 */
async function createHarness(
  bridgeOverrides: Partial<BatchBridge> = {},
  details: readonly EntryDetail[] = [entryOf("a"), entryOf("b"), entryOf("c")],
): Promise<OperationsHarness> {
  const shared = [...details];
  const entryBridge = createFakeEntryBridge([], {}, [], shared);
  const bridge = createFakeBatchBridge(shared, bridgeOverrides);
  const store = createEntryStore({ bridge: entryBridge });
  await store.getState().load();
  const clearChecked = vi.fn<() => void>();
  const operations = createBatchOperations({
    bridge,
    entryActions: store.getState(),
    clearChecked,
  });
  return {
    operations,
    store,
    clearChecked,
    bridge,
    list: entryBridge.list,
    details: shared,
  };
}

describe("批量操作: 批量删除", () => {
  it("成功后清空批量选中, 条目从列表移除", async () => {
    const { operations, store, clearChecked } = await createHarness();

    const result = await operations.removeEntries(["a", "b"]);

    expect(result).toEqual({ ok: true, value: undefined });
    expect(clearChecked).toHaveBeenCalledTimes(1);
    expect(store.getState().entries.map((entry) => entry.id)).toEqual(["c"]);
  });

  it("有条目已不存在时失败, 不清空批量选中, 列表静默重读后与数据库一致", async () => {
    const { operations, store, clearChecked, details } = await createHarness();
    details.splice(0, 1);

    const result = await operations.removeEntries(["a", "b"]);

    expect(result).toEqual({ ok: false, reason: "not-found" });
    expect(clearChecked).not.toHaveBeenCalled();
    expect(store.getState().entries.map((entry) => entry.id)).toEqual([
      "b",
      "c",
    ]);
    expect(store.getState().loadStatus).toBe("ready");
  });

  it("接口调用抛出错误时按意外错误处理, 不改动任何状态", async () => {
    const { operations, store, clearChecked } = await createHarness({
      removeEntries: () => Promise.reject(new Error("boom")),
    });

    const result = await operations.removeEntries(["a"]);

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(clearChecked).not.toHaveBeenCalled();
    expect(store.getState().entries).toHaveLength(3);
  });
});

describe("批量操作: 其它失败不动界面", () => {
  it("标签数超过上限时整批失败, 列表不变, 不清空批量选中, 也不重读", async () => {
    const fullTagIds = Array.from(
      { length: MAX_TAGS_PER_ENTRY },
      (_, index) => `t-${index}`,
    );
    const { operations, store, clearChecked, list } = await createHarness({}, [
      entryOf("a", { tagIds: fullTagIds }),
      entryOf("b"),
    ]);
    const listCalls = vi.mocked(list).mock.calls.length;

    const result = await operations.addTag(["a", "b"], "new");

    expect(result).toEqual({ ok: false, reason: "tag-limit-exceeded" });
    expect(clearChecked).not.toHaveBeenCalled();
    expect(store.getState().entries.map((entry) => entry.tagIds)).toEqual([
      fullTagIds,
      undefined,
    ]);
    expect(vi.mocked(list).mock.calls.length).toBe(listCalls);
  });
});

describe("批量操作: 移入文件夹, 加标签, 摘标签", () => {
  it("移入文件夹成功后条目的所属换成目标, 清空批量选中", async () => {
    const { operations, store, clearChecked } = await createHarness();

    const result = await operations.moveEntries(["a", "c"], "home");

    expect(result).toEqual({ ok: true, value: undefined });
    expect(clearChecked).toHaveBeenCalledTimes(1);
    expect(
      store.getState().entries.map((entry) => [entry.id, entry.folderId]),
    ).toEqual([
      ["a", "home"],
      ["b", undefined],
      ["c", "home"],
    ]);
  });

  it("加标签后条目带上新标签, 摘标签后条目不再带它", async () => {
    const { operations, store, clearChecked } = await createHarness();

    const added = await operations.addTag(["a", "b"], "t-1");
    const removed = await operations.removeTag(["a"], "t-1");

    expect(added.ok && added.value).toEqual([
      { entryId: "a", tagIds: ["t-1"] },
      { entryId: "b", tagIds: ["t-1"] },
    ]);
    expect(removed.ok).toBe(true);
    expect(clearChecked).toHaveBeenCalledTimes(2);
    expect(
      store.getState().entries.map((entry) => [entry.id, entry.tagIds]),
    ).toEqual([
      ["a", undefined],
      ["b", ["t-1"]],
      ["c", undefined],
    ]);
  });
});
