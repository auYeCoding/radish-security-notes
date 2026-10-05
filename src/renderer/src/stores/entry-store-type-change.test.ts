import { describe, expect, it } from "vitest";

import { toEntrySummary } from "@shared/entries/entry-types";

import { ROUTER_ENTRY } from "../testing/custom-type-fixtures";
import { FORUM_ENTRY } from "../testing/entry-fixtures";
import { createFakeEntryBridge } from "../testing/fake-entry-bridge";
import { createEntryStore } from "./entry-store";

describe("条目 store: 类型被修改或删除之后", () => {
  it("重新读取列表摘要, 列表里的账号换成最新的", async () => {
    const details = [ROUTER_ENTRY, FORUM_ENTRY];
    const store = createEntryStore({
      bridge: createFakeEntryBridge(details, {}, [], details),
    });
    await store.getState().load();
    details[0] = { ...ROUTER_ENTRY, account: "", fields: {} };

    await store.getState().reloadAfterTypeChange();

    expect(store.getState().entries[0].account).toBe("");
    expect(store.getState().entries).toEqual(details.map(toEntrySummary));
  });

  it("选中的条目重新读取详情, 类型与取值都是最新的", async () => {
    const details = [ROUTER_ENTRY, FORUM_ENTRY];
    const store = createEntryStore({
      bridge: createFakeEntryBridge(details, {}, [], details),
    });
    await store.getState().load();
    await store.getState().select(ROUTER_ENTRY.id);
    details[0] = { ...ROUTER_ENTRY, type: "secureNote", fields: {} };

    await store.getState().reloadAfterTypeChange();

    const { selection } = store.getState();
    expect(selection.status).toBe("ready");
    expect(selection.status === "ready" && selection.detail.type).toBe(
      "secureNote",
    );
  });
});

describe("条目 store: 类型被修改或删除之后的详情与搜索", () => {
  it("没有选中条目时不读取详情, 也不会选中任何条目", async () => {
    const bridge = createFakeEntryBridge([ROUTER_ENTRY]);
    const store = createEntryStore({ bridge });
    await store.getState().load();

    await store.getState().reloadAfterTypeChange();

    expect(bridge.get).not.toHaveBeenCalled();
    expect(store.getState().selection).toEqual({ status: "none" });
  });

  it("搜索关键字不为空时重新搜索, 为空时不调用搜索接口", async () => {
    const bridge = createFakeEntryBridge([ROUTER_ENTRY]);
    const store = createEntryStore({ bridge });
    await store.getState().load();

    await store.getState().reloadAfterTypeChange();
    expect(bridge.search).not.toHaveBeenCalled();

    store.getState().setQuery("路由");
    await store.getState().reloadAfterTypeChange();
    expect(bridge.search).toHaveBeenCalledWith("路由");
  });

  it("选中的条目已不存在时回到没有选中的状态", async () => {
    const details = [ROUTER_ENTRY, FORUM_ENTRY];
    const store = createEntryStore({
      bridge: createFakeEntryBridge(details, {}, [], details),
    });
    await store.getState().load();
    await store.getState().select(ROUTER_ENTRY.id);
    details.splice(0, 1);

    await store.getState().reloadAfterTypeChange();

    expect(store.getState().selection).toEqual({ status: "none" });
    expect(store.getState().entries).toEqual([toEntrySummary(FORUM_ENTRY)]);
  });

  it("读取列表失败时保持原样, 不抛出", async () => {
    const store = createEntryStore({
      bridge: createFakeEntryBridge([ROUTER_ENTRY], {
        list: () => Promise.reject(new Error("ipc")),
      }),
    });
    store.setState({ entries: [toEntrySummary(ROUTER_ENTRY)] });

    await expect(
      store.getState().reloadAfterTypeChange(),
    ).resolves.toBeUndefined();
    expect(store.getState().entries).toEqual([toEntrySummary(ROUTER_ENTRY)]);
  });
});
