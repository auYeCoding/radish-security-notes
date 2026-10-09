import { describe, expect, it } from "vitest";

import type { EntryDetail } from "@shared/entries/entry-types";
import { selectVisibleEntries } from "@shared/entries/visible-entries";
import { folderViewOf } from "@shared/folders/folder-view";

import { FORUM_ENTRY } from "@renderer/testing/entry-fixtures";
import { createFakeEntryBridge } from "@renderer/testing/fake-entry-bridge";

import { createEntryStore, type EntryStore } from "./entry-store";

/**
 * 生成一个条目详情: 在论坛条目的基础上换编号, 名称与其它字段.
 * @param id 条目编号.
 * @param name 条目名称.
 * @param extra 要覆盖的其它字段.
 * @returns 条目详情.
 */
function entryNamed(
  id: string,
  name: string,
  extra: Partial<EntryDetail> = {},
): EntryDetail {
  return { ...FORUM_ENTRY, id, name, ...extra };
}

/**
 * 创建带四个条目的 store, 已读取列表: 名称依次是 Aa, Bb, Cc, Dd, 列表按名称排序后也是这个顺序.
 * @param details 四个条目的详情, 默认都没有所属文件夹也没有标签.
 * @returns 条目 store.
 */
async function createLoadedStore(
  details: readonly EntryDetail[] = [
    entryNamed("a", "Aa"),
    entryNamed("b", "Bb"),
    entryNamed("c", "Cc"),
    entryNamed("d", "Dd"),
  ],
): Promise<EntryStore> {
  const store = createEntryStore({ bridge: createFakeEntryBridge(details) });
  await store.getState().load();
  return store;
}

/**
 * 取当前可见列表里条目的编号.
 * @param store 条目 store.
 * @returns 编号, 按显示顺序排列.
 */
function visibleIds(store: EntryStore): string[] {
  const { entries, searchMatches, view } = store.getState();
  return selectVisibleEntries({ entries, view, matches: searchMatches }).map(
    (entry) => entry.id,
  );
}

describe("条目 store 批量删除的内存更新", () => {
  it("被删的条目从列表移除, 详情里的条目不在其中时详情不变", async () => {
    const store = await createLoadedStore();
    await store.getState().select("a");

    await store.getState().applyBatchRemoval(["b", "c"]);

    expect(store.getState().entries.map((entry) => entry.id)).toEqual([
      "a",
      "d",
    ]);
    expect(store.getState().selection).toMatchObject({
      status: "ready",
      detail: { id: "a" },
    });
  });

  it("详情里的条目被删时选中原位置之后第一个仍在的条目并读取它的详情", async () => {
    const store = await createLoadedStore();
    await store.getState().select("b");

    await store.getState().applyBatchRemoval(["b", "c"]);

    expect(store.getState().selection).toMatchObject({
      status: "ready",
      detail: { id: "d" },
    });
  });

  it("之后没有仍在的条目时选中之前最近的", async () => {
    const store = await createLoadedStore();
    await store.getState().select("d");

    await store.getState().applyBatchRemoval(["c", "d"]);

    expect(store.getState().selection).toMatchObject({
      status: "ready",
      detail: { id: "b" },
    });
  });

  it("全部条目都被删时回到没有选中的状态", async () => {
    const store = await createLoadedStore();
    await store.getState().select("b");

    await store.getState().applyBatchRemoval(["a", "b", "c", "d"]);

    expect(store.getState().entries).toEqual([]);
    expect(store.getState().selection).toEqual({ status: "none" });
  });

  it("没有选中条目时只更新列表", async () => {
    const store = await createLoadedStore();

    await store.getState().applyBatchRemoval(["a"]);

    expect(store.getState().entries).toHaveLength(3);
    expect(store.getState().selection).toEqual({ status: "none" });
  });
});

describe("条目 store 批量移入文件夹的内存更新", () => {
  it("条目的所属换成目标, 入口是全部条目时条目仍留在列表里, 详情同步新的所属", async () => {
    const store = await createLoadedStore();
    await store.getState().select("a");

    await store.getState().applyBatchFolder(["a", "b"], "home");

    expect(
      store.getState().entries.map((entry) => [entry.id, entry.folderId]),
    ).toEqual([
      ["a", "home"],
      ["b", "home"],
      ["c", undefined],
      ["d", undefined],
    ]);
    expect(store.getState().selection).toMatchObject({
      status: "ready",
      detail: { id: "a", folderId: "home" },
    });
  });

  it("详情里的条目移出当前入口时选中入口里仍在的相邻条目", async () => {
    const store = await createLoadedStore([
      entryNamed("a", "Aa", { folderId: "work" }),
      entryNamed("b", "Bb", { folderId: "work" }),
      entryNamed("c", "Cc", { folderId: "work" }),
      entryNamed("d", "Dd"),
    ]);
    store.getState().selectView(folderViewOf("work"));
    await store.getState().select("b");

    await store.getState().applyBatchFolder(["a", "b"], "home");

    expect(visibleIds(store)).toEqual(["c"]);
    expect(store.getState().selection).toMatchObject({
      status: "ready",
      detail: { id: "c" },
    });
  });

  it("入口里的条目都被移走时回到没有选中的状态", async () => {
    const store = await createLoadedStore([
      entryNamed("a", "Aa", { folderId: "work" }),
      entryNamed("b", "Bb", { folderId: "work" }),
    ]);
    store.getState().selectView(folderViewOf("work"));
    await store.getState().select("a");

    await store.getState().applyBatchFolder(["a", "b"], undefined);

    expect(store.getState().selection).toEqual({ status: "none" });
  });
});

describe("条目 store 批量加标签与摘标签的内存更新", () => {
  it("条目的标签换成接口返回的新标签, 没有标签时不带标签字段, 详情同步", async () => {
    const store = await createLoadedStore([
      entryNamed("a", "Aa", { tagIds: ["t1"] }),
      entryNamed("b", "Bb"),
    ]);
    await store.getState().select("a");

    await store.getState().applyBatchTags([
      { entryId: "a", tagIds: [] },
      { entryId: "b", tagIds: ["t2"] },
    ]);

    expect(
      store.getState().entries.map((entry) => [entry.id, entry.tagIds]),
    ).toEqual([
      ["a", undefined],
      ["b", ["t2"]],
    ]);
    expect(store.getState().selection).toMatchObject({
      status: "ready",
      detail: { id: "a", tagIds: undefined },
    });
  });

  it("摘标签不改变可见列表, 详情里的条目保持选中", async () => {
    const store = await createLoadedStore([
      entryNamed("a", "Aa", { tagIds: ["t1"] }),
      entryNamed("b", "Bb", { tagIds: ["t1"] }),
      entryNamed("c", "Cc", { tagIds: ["t1"] }),
    ]);
    await store.getState().select("a");

    await store.getState().applyBatchTags([
      { entryId: "a", tagIds: [] },
      { entryId: "b", tagIds: [] },
    ]);

    expect(visibleIds(store)).toEqual(["a", "b", "c"]);
    expect(store.getState().selection).toMatchObject({
      status: "ready",
      detail: { id: "a", tagIds: undefined },
    });
  });
});

describe("条目 store 批量操作不波及详情", () => {
  it("选中的条目没被动到时, 即使别的条目移出了入口, 详情也原样保留且不重新读取", async () => {
    const bridge = createFakeEntryBridge([
      entryNamed("a", "Aa", { folderId: "work" }),
      entryNamed("b", "Bb", { folderId: "work" }),
    ]);
    const store = createEntryStore({ bridge });
    await store.getState().load();
    store.getState().selectView(folderViewOf("work"));
    await store.getState().select("a");
    const selection = store.getState().selection;

    await store.getState().applyBatchFolder(["b"], "home");

    expect(store.getState().selection).toBe(selection);
    expect(bridge.get).toHaveBeenCalledTimes(1);
    expect(visibleIds(store)).toEqual(["a"]);
  });

  it("没有选中条目时只更新列表", async () => {
    const store = await createLoadedStore();

    await store.getState().applyBatchTags([{ entryId: "a", tagIds: ["t1"] }]);

    expect(store.getState().selection).toEqual({ status: "none" });
    expect(store.getState().entries[0]?.tagIds).toEqual(["t1"]);
  });
});

describe("条目 store 静默重读", () => {
  it("重读后列表与数据库一致, 读取状态不变, 详情里的条目已不存在时回到没有选中", async () => {
    const shared = [entryNamed("a", "Aa"), entryNamed("b", "Bb")];
    const store = createEntryStore({
      bridge: createFakeEntryBridge([], {}, [], shared),
    });
    await store.getState().load();
    await store.getState().select("b");
    shared.splice(1, 1);

    await store.getState().refresh();

    expect(store.getState().entries.map((entry) => entry.id)).toEqual(["a"]);
    expect(store.getState().loadStatus).toBe("ready");
    expect(store.getState().selection).toEqual({ status: "none" });
  });

  it("详情里的条目仍在时保持选中, 读取失败时列表保持原样", async () => {
    const shared = [entryNamed("a", "Aa")];
    let isFailing = false;
    const bridge = createFakeEntryBridge([], {}, [], shared);
    const store = createEntryStore({
      bridge: {
        ...bridge,
        list: () =>
          isFailing ? Promise.reject(new Error("boom")) : bridge.list(),
      },
    });
    await store.getState().load();
    await store.getState().select("a");

    await store.getState().refresh();
    expect(store.getState().selection).toMatchObject({ status: "ready" });

    isFailing = true;
    shared.splice(0, 1);
    await store.getState().refresh();
    expect(store.getState().entries).toHaveLength(1);
  });
});
