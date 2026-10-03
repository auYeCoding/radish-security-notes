import { describe, expect, it } from "vitest";

import { entryFailed } from "@shared/entries/entry-result";
import type { UpdateEntryInput } from "@shared/entries/entry-types";

import {
  BANK_ENTRY,
  FORUM_ENTRY,
  WIKI_ENTRY,
} from "@renderer/testing/entry-fixtures";
import { createFakeEntryBridge } from "@renderer/testing/fake-entry-bridge";

import { createEntryStore, type EntryStore } from "./entry-store";

/**
 * 把论坛条目改名为 "论坛改" 的更新输入.
 */
const RENAME_FORUM_INPUT: UpdateEntryInput = {
  name: "论坛改",
  fields: { account: "forum-new", password: "forum-new-p", url: "" },
  notes: "",
  customFields: [],
  totp: "",
  removeTotp: false,
};

/**
 * 创建带三个条目的 store, 已读取列表.
 * @param overrides 覆盖假桥上的方法.
 * @returns 条目 store.
 */
async function createLoadedStore(
  overrides: Parameters<typeof createFakeEntryBridge>[1] = {},
): Promise<EntryStore> {
  const store = createEntryStore({
    bridge: createFakeEntryBridge(
      [FORUM_ENTRY, BANK_ENTRY, WIKI_ENTRY],
      overrides,
    ),
  });
  await store.getState().load();
  return store;
}

describe("条目 store 更新", () => {
  it("成功后列表原位换成新摘要, 正在显示的详情换成新详情, 编辑次数加一", async () => {
    const store = await createLoadedStore();
    await store.getState().select("bank");

    const result = await store.getState().update("bank", RENAME_FORUM_INPUT);

    expect(result.ok).toBe(true);
    expect(store.getState().entries).toEqual([
      { id: "forum", name: "论坛", type: "login", account: "forum-account" },
      { id: "bank", name: "论坛改", type: "login", account: "forum-new" },
      { id: "wiki", name: "维基", type: "login", account: "wiki-account" },
    ]);
    expect(store.getState().selection).toMatchObject({
      status: "ready",
      detail: { id: "bank", name: "论坛改" },
    });
    expect(store.getState().detailRevision).toBe(1);
  });

  it("没有选中该条目时选中状态不变, 搜索关键字不动", async () => {
    const store = await createLoadedStore();
    await store.getState().select("forum");
    store.getState().setQuery("wiki");

    await store.getState().update("wiki", RENAME_FORUM_INPUT);

    expect(store.getState().selection).toMatchObject({
      status: "ready",
      detail: { id: "forum", name: "论坛" },
    });
    expect(store.getState().query).toBe("wiki");
  });

  it("失败时不改动列表与选中, 编辑次数不变", async () => {
    const store = await createLoadedStore();
    await store.getState().select("bank");
    const before = store.getState();

    const result = await store.getState().update("missing", RENAME_FORUM_INPUT);

    expect(result).toEqual({ ok: false, reason: "not-found" });
    expect(store.getState().entries).toEqual(before.entries);
    expect(store.getState().selection).toEqual(before.selection);
    expect(store.getState().detailRevision).toBe(0);
  });

  it("接口调用抛出错误时返回意外错误", async () => {
    const store = await createLoadedStore({
      update: () => Promise.reject(new Error("ipc")),
    });

    const result = await store.getState().update("bank", RENAME_FORUM_INPUT);

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
  });
});

describe("条目 store 删除", () => {
  it("删除没有选中的条目只移出列表, 选中状态不变", async () => {
    const store = await createLoadedStore();
    await store.getState().select("forum");

    const result = await store.getState().remove("wiki");

    expect(result).toEqual({ ok: true, value: undefined });
    expect(store.getState().entries.map((entry) => entry.id)).toEqual([
      "forum",
      "bank",
    ]);
    expect(store.getState().selection).toMatchObject({
      status: "ready",
      detail: { id: "forum" },
    });
  });

  it("删除选中的条目后选中原位置的下一项并读取它的详情", async () => {
    const store = await createLoadedStore();
    await store.getState().select("bank");

    await store.getState().remove("bank");

    expect(store.getState().entries.map((entry) => entry.id)).toEqual([
      "forum",
      "wiki",
    ]);
    expect(store.getState().selection).toMatchObject({
      status: "ready",
      detail: { id: "wiki" },
    });
  });

  it("删除选中的最后一项后选中上一项", async () => {
    const store = await createLoadedStore();
    await store.getState().select("wiki");

    await store.getState().remove("wiki");

    expect(store.getState().selection).toMatchObject({
      status: "ready",
      detail: { id: "bank" },
    });
  });

  it("删除唯一的条目后回到没有选中的状态", async () => {
    const store = createEntryStore({
      bridge: createFakeEntryBridge([FORUM_ENTRY]),
    });
    await store.getState().load();
    await store.getState().select("forum");

    await store.getState().remove("forum");

    expect(store.getState().entries).toEqual([]);
    expect(store.getState().selection).toEqual({ status: "none" });
  });
});

describe("条目 store 删除后的选中", () => {
  it("按显示顺序 (名称排序) 选中相邻条目, 不按创建顺序", async () => {
    const store = await createLoadedStore();
    await store.getState().select("forum");

    await store.getState().remove("forum");

    expect(store.getState().selection).toMatchObject({
      status: "ready",
      detail: { id: "wiki" },
    });
  });
});

describe("条目 store 删除的边界", () => {
  it("搜索过滤时按当前可见的列表选中相邻条目", async () => {
    const store = await createLoadedStore();
    store.getState().setQuery("account");
    await store.getState().select("forum");
    store.getState().setQuery("forum");

    await store.getState().remove("forum");

    expect(store.getState().selection).toEqual({ status: "none" });
    expect(store.getState().entries.map((entry) => entry.id)).toEqual([
      "bank",
      "wiki",
    ]);
  });

  it("失败时不改动列表与选中", async () => {
    const store = await createLoadedStore({
      remove: () => Promise.resolve(entryFailed("not-found")),
    });
    await store.getState().select("bank");

    const result = await store.getState().remove("bank");

    expect(result).toEqual({ ok: false, reason: "not-found" });
    expect(store.getState().entries).toHaveLength(3);
    expect(store.getState().selection).toMatchObject({
      status: "ready",
      detail: { id: "bank" },
    });
  });

  it("接口调用抛出错误时返回意外错误", async () => {
    const store = await createLoadedStore({
      remove: () => Promise.reject(new Error("ipc")),
    });

    const result = await store.getState().remove("bank");

    expect(result).toEqual({ ok: false, reason: "unexpected-error" });
    expect(store.getState().entries).toHaveLength(3);
  });
});
