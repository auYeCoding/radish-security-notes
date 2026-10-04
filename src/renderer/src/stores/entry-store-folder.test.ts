import { describe, expect, it } from "vitest";

import type {
  EntryDetail,
  NewEntryInput,
  UpdateEntryInput,
} from "@shared/entries/entry-types";
import {
  ALL_ENTRIES_VIEW,
  UNCATEGORIZED_VIEW,
  folderViewOf,
} from "@shared/folders/folder-view";

import {
  BANK_ENTRY,
  FORUM_ENTRY,
  WALLET_ENTRY,
  WIKI_ENTRY,
} from "@renderer/testing/entry-fixtures";
import { createFakeEntryBridge } from "@renderer/testing/fake-entry-bridge";

import { createEntryStore, type EntryStore } from "./entry-store";

/**
 * 在工作文件夹里的论坛条目.
 */
const WORK_FORUM: EntryDetail = { ...FORUM_ENTRY, folderId: "work" };

/**
 * 在工作文件夹里的银行条目.
 */
const WORK_BANK: EntryDetail = { ...BANK_ENTRY, folderId: "work" };

/**
 * 在家庭文件夹里的钱包条目.
 */
const HOME_WALLET: EntryDetail = { ...WALLET_ENTRY, folderId: "home" };

/**
 * 创建带四个条目的 store, 已读取列表: 论坛与银行在工作, 维基未分类, 钱包在家庭.
 * @returns 条目 store.
 */
async function createLoadedStore(): Promise<EntryStore> {
  const store = createEntryStore({
    bridge: createFakeEntryBridge([
      WORK_FORUM,
      WORK_BANK,
      WIKI_ENTRY,
      HOME_WALLET,
    ]),
  });
  await store.getState().load();
  return store;
}

/**
 * 取 store 里每个条目的编号与所属文件夹.
 * @param store 条目 store.
 * @returns 编号与所属文件夹编号组成的数组, 未分类的所属为 "none".
 */
function placements(store: EntryStore): string[][] {
  return store
    .getState()
    .entries.map((entry) => [entry.id, entry.folderId ?? "none"]);
}

/**
 * 通用登录的新建输入, 名称为 "新条目", 所属文件夹由调用方给出.
 * @param folderId 所属文件夹编号, 未分类时省略.
 * @returns 新建输入.
 */
function newInputIn(folderId?: string): NewEntryInput {
  return {
    type: "login",
    name: "新条目",
    fields: { account: "n", password: "p", url: "" },
    notes: "",
    notesFormat: "plain",
    customFields: [],
    totp: "",
    folderId,
  };
}

describe("条目 store 入口与选中", () => {
  it("初始入口是全部条目, 条目摘要带所属文件夹", async () => {
    const store = await createLoadedStore();

    expect(store.getState().view).toEqual(ALL_ENTRIES_VIEW);
    expect(placements(store)).toEqual([
      ["forum", "work"],
      ["bank", "work"],
      ["wiki", "none"],
      ["wallet", "home"],
    ]);
  });

  it("切换入口时, 选中的条目不属于新入口就回到没有选中, 属于就保留", async () => {
    const store = await createLoadedStore();
    await store.getState().select("wiki");

    store.getState().selectView(folderViewOf("work"));
    expect(store.getState().selection).toEqual({ status: "none" });

    await store.getState().select("forum");
    store.getState().selectView(folderViewOf("work"));
    expect(store.getState().selection).toMatchObject({ status: "ready" });
    store.getState().selectView(ALL_ENTRIES_VIEW);
    expect(store.getState().selection).toMatchObject({ status: "ready" });
  });

  it("切换入口不改搜索关键字, 没有选中时只换入口", async () => {
    const store = await createLoadedStore();
    store.getState().setQuery("维基");

    store.getState().selectView(UNCATEGORIZED_VIEW);

    expect(store.getState().view).toEqual(UNCATEGORIZED_VIEW);
    expect(store.getState().query).toBe("维基");
    expect(store.getState().selection).toEqual({ status: "none" });
  });
});

describe("条目 store 把条目放进文件夹", () => {
  it("没有被选中的条目只在列表里换归属, 选中状态不变", async () => {
    const store = await createLoadedStore();
    await store.getState().select("wiki");

    await store.getState().applyEntryFolder("forum", "home");

    expect(placements(store)[0]).toEqual(["forum", "home"]);
    expect(store.getState().selection).toMatchObject({
      status: "ready",
      detail: { id: "wiki" },
    });
  });

  it("入口是全部条目时, 被选中的条目留在列表里, 详情换成新的所属", async () => {
    const store = await createLoadedStore();
    await store.getState().select("forum");

    await store.getState().applyEntryFolder("forum", undefined);

    expect(placements(store)[0]).toEqual(["forum", "none"]);
    expect(store.getState().selection).toMatchObject({
      status: "ready",
      detail: { id: "forum", folderId: undefined },
    });
  });

  it("被选中的条目移出当前入口后选中相邻条目并读取它的详情", async () => {
    const store = await createLoadedStore();
    store.getState().selectView(folderViewOf("work"));
    await store.getState().select("forum");

    await store.getState().applyEntryFolder("forum", "home");

    expect(store.getState().view).toEqual(folderViewOf("work"));
    expect(store.getState().selection).toMatchObject({
      status: "ready",
      detail: { id: "bank" },
    });
  });

  it("当前入口里没有别的条目时回到没有选中的状态", async () => {
    const store = await createLoadedStore();
    store.getState().selectView(folderViewOf("home"));
    await store.getState().select("wallet");

    await store.getState().applyEntryFolder("wallet", undefined);

    expect(store.getState().selection).toEqual({ status: "none" });
    expect(placements(store)[3]).toEqual(["wallet", "none"]);
  });

  it("相邻条目按搜索关键字过滤后的可见列表计算", async () => {
    const store = await createLoadedStore();
    store.getState().selectView(folderViewOf("work"));
    store.getState().setQuery("银行");
    await store.getState().search();
    await store.getState().select("bank");

    await store.getState().applyEntryFolder("bank", "home");

    expect(store.getState().selection).toEqual({ status: "none" });
  });
});

describe("条目 store 释放已删除的文件夹", () => {
  it("其中条目回到未分类, 别的文件夹的条目不变", async () => {
    const store = await createLoadedStore();

    store.getState().releaseFolder("work");

    expect(placements(store)).toEqual([
      ["forum", "none"],
      ["bank", "none"],
      ["wiki", "none"],
      ["wallet", "home"],
    ]);
  });

  it("当前入口正是这个文件夹时回到全部条目, 别的入口不变", async () => {
    const store = await createLoadedStore();
    store.getState().selectView(folderViewOf("work"));

    store.getState().releaseFolder("home");
    expect(store.getState().view).toEqual(folderViewOf("work"));
    store.getState().releaseFolder("work");

    expect(store.getState().view).toEqual(ALL_ENTRIES_VIEW);
  });

  it("选中的条目在这个文件夹里时详情的所属也被清空", async () => {
    const store = await createLoadedStore();
    await store.getState().select("forum");

    store.getState().releaseFolder("work");

    expect(store.getState().selection).toMatchObject({
      status: "ready",
      detail: { id: "forum", folderId: undefined },
    });
  });
});

/**
 * 论坛条目的更新输入, 不带所属文件夹.
 */
const FORUM_UPDATE_INPUT: UpdateEntryInput = {
  name: "论坛",
  fields: { account: "a", password: "p", url: "" },
  notes: "",
  notesFormat: "plain",
  customFields: [],
  totp: "",
  removeTotp: false,
};

describe("条目 store 入口跟随条目", () => {
  it("新建的条目不属于当前入口时, 入口切到它所属的文件夹, 未分类则切到未分类", async () => {
    const store = await createLoadedStore();
    store.getState().selectView(folderViewOf("work"));

    await store.getState().create(newInputIn("home"));
    expect(store.getState().view).toEqual(folderViewOf("home"));
    await store.getState().create(newInputIn());

    expect(store.getState().view).toEqual(UNCATEGORIZED_VIEW);
  });

  it("新建的条目属于当前入口, 或入口是全部条目时入口不变", async () => {
    const store = await createLoadedStore();
    store.getState().selectView(folderViewOf("work"));

    await store.getState().create(newInputIn("work"));
    expect(store.getState().view).toEqual(folderViewOf("work"));
    store.getState().selectView(ALL_ENTRIES_VIEW);
    await store.getState().create(newInputIn("home"));

    expect(store.getState().view).toEqual(ALL_ENTRIES_VIEW);
  });

  it("编辑把条目改到别的文件夹后入口跟随, 所属没变时入口不变", async () => {
    const store = await createLoadedStore();
    store.getState().selectView(folderViewOf("work"));
    await store.getState().select("forum");

    await store
      .getState()
      .update("forum", { ...FORUM_UPDATE_INPUT, folderId: "work" });
    expect(store.getState().view).toEqual(folderViewOf("work"));
    await store
      .getState()
      .update("forum", { ...FORUM_UPDATE_INPUT, folderId: "home" });

    expect(store.getState().view).toEqual(folderViewOf("home"));
    expect(store.getState().selection).toMatchObject({
      status: "ready",
      detail: { id: "forum", folderId: "home" },
    });
  });

  it("删除选中的条目时, 相邻条目按当前入口里的可见列表选", async () => {
    const store = await createLoadedStore();
    store.getState().selectView(folderViewOf("work"));
    await store.getState().select("bank");

    await store.getState().remove("bank");

    expect(store.getState().selection).toMatchObject({
      status: "ready",
      detail: { id: "forum" },
    });
  });
});
