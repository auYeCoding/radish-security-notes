import { describe, expect, it } from "vitest";

import type { EntryDetail, NewEntryInput } from "@shared/entries/entry-types";
import { folderViewOf } from "@shared/folders/folder-view";

import {
  BANK_ENTRY,
  FORUM_ENTRY,
  WIKI_ENTRY,
} from "@renderer/testing/entry-fixtures";
import { createFakeEntryBridge } from "@renderer/testing/fake-entry-bridge";

import { createEntryStore, type EntryStore } from "./entry-store";
import { selectedIdOf } from "./entry-state";

/**
 * 带重要与工作两个标签的论坛条目.
 */
const FORUM_BOTH: EntryDetail = {
  ...FORUM_ENTRY,
  tagIds: ["important", "work-tag"],
};

/**
 * 只带工作标签的银行条目, 在工作文件夹里.
 */
const BANK_WORK: EntryDetail = {
  ...BANK_ENTRY,
  tagIds: ["work-tag"],
  folderId: "work",
};

/**
 * 创建带三个条目的 store, 已读取列表: 论坛带重要与工作, 银行带工作, 维基没有标签.
 * @returns 条目 store.
 */
async function createLoadedStore(): Promise<EntryStore> {
  const store = createEntryStore({
    bridge: createFakeEntryBridge([FORUM_BOTH, BANK_WORK, WIKI_ENTRY]),
  });
  await store.getState().load();
  return store;
}

/**
 * 通用登录的新建输入, 名称为 "新条目", 标签由调用方给出.
 * @param tagIds 带的标签编号, 不带标签时省略.
 * @returns 新建输入.
 */
function newInputWith(tagIds?: string[]): NewEntryInput {
  return {
    type: "login",
    name: "新条目",
    fields: { account: "n", password: "p", url: "" },
    notes: "",
    notesFormat: "plain",
    customFields: [],
    totp: "",
    tagIds,
  };
}

describe("条目 store 切换已选标签", () => {
  it("初始没有已选标签, 点标签后追加, 再点取消", async () => {
    const store = await createLoadedStore();

    expect(store.getState().selectedTagIds).toEqual([]);
    store.getState().toggleTag("work-tag");
    store.getState().toggleTag("important");
    expect(store.getState().selectedTagIds).toEqual(["work-tag", "important"]);
    store.getState().toggleTag("work-tag");
    expect(store.getState().selectedTagIds).toEqual(["important"]);
  });

  it("选中的条目仍带全部已选标签时选中保持, 不再满足时回到没有选中", async () => {
    const store = await createLoadedStore();
    await store.getState().select("forum");

    store.getState().toggleTag("work-tag");
    expect(selectedIdOf(store.getState().selection)).toBe("forum");
    store.getState().toggleTag("important");
    expect(selectedIdOf(store.getState().selection)).toBe("forum");

    await store.getState().select("bank");
    store.getState().toggleTag("work-tag");
    expect(store.getState().selection).toEqual({ status: "none" });
  });

  it("选中的条目没有这个标签时, 选了它就回到没有选中", async () => {
    const store = await createLoadedStore();
    await store.getState().select("wiki");

    store.getState().toggleTag("work-tag");

    expect(store.getState().selection).toEqual({ status: "none" });
  });
});

describe("条目 store 释放已删除的标签", () => {
  it("条目上的这个标签被摘掉, 没有标签的条目不再带 tagIds, 已选标签里的它被去掉", async () => {
    const store = await createLoadedStore();
    store.getState().toggleTag("work-tag");

    store.getState().releaseTag("work-tag");

    expect(store.getState().selectedTagIds).toEqual([]);
    expect(
      store.getState().entries.map((entry) => [entry.id, entry.tagIds]),
    ).toEqual([
      ["forum", ["important"]],
      ["bank", undefined],
      ["wiki", undefined],
    ]);
  });

  it("选中的条目详情同步摘掉这个标签", async () => {
    const store = await createLoadedStore();
    await store.getState().select("forum");

    store.getState().releaseTag("important");

    const { selection } = store.getState();
    expect(selection.status === "ready" && selection.detail.tagIds).toEqual([
      "work-tag",
    ]);
  });

  it("没有条目带这个标签时什么都不变", async () => {
    const store = await createLoadedStore();
    const before = store.getState().entries;

    store.getState().releaseTag("unknown");

    expect(store.getState().entries).toEqual(before);
  });
});

describe("条目 store 新建与保存后的标签筛选", () => {
  it("新建的条目不带全部已选标签时, 已选标签收窄到它带的那几个", async () => {
    const store = await createLoadedStore();
    store.getState().toggleTag("important");
    store.getState().toggleTag("work-tag");

    await store.getState().create(newInputWith(["work-tag"]));

    expect(store.getState().selectedTagIds).toEqual(["work-tag"]);
    expect(selectedIdOf(store.getState().selection)).toBe("created-4");
  });

  it("新建的条目没有标签时, 已选标签被清空", async () => {
    const store = await createLoadedStore();
    store.getState().toggleTag("important");

    await store.getState().create(newInputWith());

    expect(store.getState().selectedTagIds).toEqual([]);
  });

  it("编辑保存后条目不再带某些已选标签时, 取消这些已选标签, 条目保持选中", async () => {
    const store = await createLoadedStore();
    store.getState().toggleTag("important");
    store.getState().toggleTag("work-tag");
    await store.getState().select("forum");

    await store.getState().update("forum", {
      name: "论坛",
      fields: FORUM_ENTRY.fields,
      notes: "",
      notesFormat: "plain",
      customFields: [],
      totp: "",
      removeTotp: false,
      tagIds: ["work-tag"],
    });

    expect(store.getState().selectedTagIds).toEqual(["work-tag"]);
    expect(selectedIdOf(store.getState().selection)).toBe("forum");
  });
});

describe("条目 store 删除与移动时的可见列表", () => {
  it("删除选中的条目时按已选标签选中相邻条目", async () => {
    const store = await createLoadedStore();
    store.getState().toggleTag("work-tag");
    await store.getState().select("forum");

    await store.getState().remove("forum");

    expect(selectedIdOf(store.getState().selection)).toBe("bank");
  });

  it("把选中的条目移出当前入口时, 按已选标签选中相邻条目", async () => {
    const store = await createLoadedStore();
    store.getState().selectView(folderViewOf("work"));
    store.getState().toggleTag("work-tag");
    await store.getState().select("bank");

    await store.getState().applyEntryFolder("bank", undefined);

    expect(store.getState().selection).toEqual({ status: "none" });
  });
});
