import { describe, expect, it } from "vitest";

import type { EntryDetail } from "@shared/entries/entry-types";

import {
  BANK_ENTRY,
  FORUM_ENTRY,
  WIKI_ENTRY,
} from "@renderer/testing/entry-fixtures";
import { createFakeEntryBridge } from "@renderer/testing/fake-entry-bridge";

import { createEntryStore, type EntryStore } from "./entry-store";

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

describe("条目 store 释放已删除的标签", () => {
  it("条目上的这个标签被摘掉, 没有标签的条目不再带 tagIds", async () => {
    const store = await createLoadedStore();

    store.getState().releaseTag("work-tag");

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
