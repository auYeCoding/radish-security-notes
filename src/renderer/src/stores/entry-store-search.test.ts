import { describe, expect, it, vi } from "vitest";

import type { EntryBridge } from "@shared/entries/entry-bridge";
import { entryFailed, entrySucceeded } from "@shared/entries/entry-result";
import type { EntrySearchHit } from "@shared/search/entry-search-types";

import {
  FORUM_ENTRY,
  TEST_ENTRIES,
  WIKI_ENTRY,
} from "../testing/entry-fixtures";
import { createFakeEntryBridge } from "../testing/fake-entry-bridge";
import { createEntryStore, type EntryStore } from "./entry-store";

/**
 * 用假桥创建并读取好条目的 store.
 * @param overrides 覆盖假桥上的方法.
 * @returns 已读取条目的 store.
 */
async function createLoadedStore(
  overrides: Partial<EntryBridge> = {},
): Promise<EntryStore> {
  const store = createEntryStore({
    bridge: createFakeEntryBridge(TEST_ENTRIES, overrides),
  });
  await store.getState().load();
  return store;
}

/**
 * 取命中表里的条目编号.
 * @param store 条目 store.
 * @returns 命中的条目编号, 没有命中表时为 undefined.
 */
function matchedIds(store: EntryStore): string[] | undefined {
  const matches = store.getState().searchMatches;
  return matches === undefined ? undefined : Array.from(matches.keys());
}

describe("条目 store 搜索: 命中表", () => {
  it("搜索把命中的条目编号与命中字段放进命中表", async () => {
    const store = await createLoadedStore();

    store.getState().setQuery("bank");
    await store.getState().search();

    expect(matchedIds(store)).toEqual(["bank"]);
    expect(store.getState().searchMatches?.get("bank")).toEqual(["account"]);
    expect(store.getState().searchedQuery).toBe("bank");
  });

  it("关键字为空或只有空白时不调用接口, 命中表保持为空", async () => {
    const bridge = createFakeEntryBridge(TEST_ENTRIES);
    const store = createEntryStore({ bridge });
    await store.getState().load();

    store.getState().setQuery("   ");
    await store.getState().search();

    expect(bridge.search).not.toHaveBeenCalled();
    expect(store.getState().searchMatches).toBeUndefined();
  });

  it("关键字改成空时立即丢弃命中表, 不等下一次搜索", async () => {
    const store = await createLoadedStore();
    store.getState().setQuery("bank");
    await store.getState().search();

    store.getState().setQuery("");

    expect(store.getState().query).toBe("");
    expect(store.getState().searchMatches).toBeUndefined();
    expect(store.getState().searchedQuery).toBe("");
  });

  it("关键字改成另一个非空词时保留上一次的命中表与它的关键字, 直到新结果返回", async () => {
    const store = await createLoadedStore();
    store.getState().setQuery("bank");
    await store.getState().search();

    store.getState().setQuery("forum");

    expect(matchedIds(store)).toEqual(["bank"]);
    expect(store.getState().searchedQuery).toBe("bank");
    await store.getState().search();
    expect(matchedIds(store)).toEqual(["forum"]);
    expect(store.getState().searchedQuery).toBe("forum");
  });
});

describe("条目 store 搜索: 过时与失败", () => {
  it("搜索期间关键字又变了, 过时的结果被丢弃", async () => {
    let resolveFirst: (hits: EntrySearchHit[]) => void = () => undefined;
    const search = vi
      .fn<EntryBridge["search"]>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = (hits) => resolve(entrySucceeded(hits));
          }),
      )
      .mockResolvedValue(
        entrySucceeded([{ id: "wiki", fields: ["name" as const] }]),
      );
    const store = await createLoadedStore({ search });
    store.getState().setQuery("bank");
    const first = store.getState().search();
    store.getState().setQuery("wiki");
    await store.getState().search();

    resolveFirst([{ id: "bank", fields: ["name"] }]);
    await first;

    expect(matchedIds(store)).toEqual(["wiki"]);
  });

  it("搜索失败或接口抛出错误时保留上一次的命中表, 不抛出", async () => {
    const search = vi
      .fn<EntryBridge["search"]>()
      .mockResolvedValueOnce(
        entrySucceeded([{ id: "bank", fields: ["name" as const] }]),
      )
      .mockResolvedValueOnce(entryFailed("vault-locked"))
      .mockRejectedValueOnce(new Error("ipc"));
    const store = await createLoadedStore({ search });
    store.getState().setQuery("bank");
    await store.getState().search();

    await store.getState().search();
    await expect(store.getState().search()).resolves.toBeUndefined();

    expect(matchedIds(store)).toEqual(["bank"]);
  });
});

describe("条目 store 搜索: 新建, 编辑与删除之后", () => {
  it("新建条目后关键字与命中表一起清空", async () => {
    const store = await createLoadedStore();
    store.getState().setQuery("bank");
    await store.getState().search();

    await store.getState().create({
      type: "login",
      name: "新条目",
      fields: { account: "new", password: "", url: "" },
      notes: "",
      customFields: [],
      totp: "",
    });

    expect(store.getState().query).toBe("");
    expect(store.getState().searchMatches).toBeUndefined();
    expect(store.getState().searchedQuery).toBe("");
  });

  it("编辑后重新搜索, 结果与最新内容一致", async () => {
    const store = await createLoadedStore();
    store.getState().setQuery("forum-account");
    await store.getState().search();
    expect(matchedIds(store)).toEqual(["forum"]);

    await store.getState().update("forum", {
      name: FORUM_ENTRY.name,
      fields: { account: "renamed-account", password: "x", url: "" },
      notes: "",
      customFields: [],
      totp: "",
      removeTotp: false,
    });
    await store.getState().search();

    expect(matchedIds(store)).toEqual([]);
  });

  it("删除后条目不在列表里, 重新搜索也不会再出现", async () => {
    const store = await createLoadedStore();
    store.getState().setQuery("account");
    await store.getState().search();
    expect(matchedIds(store)).toEqual(["forum", "bank", "wiki"]);

    await store.getState().remove("bank");
    await store.getState().search();

    expect(matchedIds(store)).toEqual(["forum", "wiki"]);
    expect(store.getState().entries.map((entry) => entry.id)).toEqual([
      FORUM_ENTRY.id,
      WIKI_ENTRY.id,
    ]);
  });
});
