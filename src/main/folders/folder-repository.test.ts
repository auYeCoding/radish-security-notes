import { describe, expect, it } from "vitest";

import { useVaultDatabase } from "../testing/use-vault-database";
import {
  insertEntry,
  findEntry,
  type EntryRecord,
} from "../entries/entry-repository";
import {
  deleteFolderKeepingEntries,
  findFolder,
  insertFolder,
  isFolderChoiceValid,
  listFolders,
  renameFolder,
  setEntryFolder,
} from "./folder-repository";

/**
 * 构造一个测试用的条目行.
 * @param id 条目编号.
 * @param folderId 所属文件夹编号, 未分类时为 null.
 * @returns 条目行.
 */
function entryOf(id: string, folderId: string | null): EntryRecord {
  return {
    id,
    name: `name-${id}`,
    type: "login",
    fields: {},
    notes: "",
    notesFormat: "plain",
    customFields: [],
    totp: null,
    folderId,
    createdAt: 1,
  };
}

describe("文件夹仓库: 读写", () => {
  const getDatabase = useVaultDatabase("folder-repository");

  it("插入的文件夹能按编号读回, 没有这个编号时读不到", () => {
    const { orm } = getDatabase();
    insertFolder(orm, { id: "f-1", name: "工作", createdAt: 1 });

    expect(findFolder(orm, "f-1")).toEqual({
      id: "f-1",
      name: "工作",
      createdAt: 1,
    });
    expect(findFolder(orm, "missing")).toBeUndefined();
  });

  it("列表按创建时间从旧到新, 创建时间相同时先插入的在前", () => {
    const { orm } = getDatabase();
    insertFolder(orm, { id: "late", name: "晚", createdAt: 9 });
    insertFolder(orm, { id: "first", name: "同时甲", createdAt: 5 });
    insertFolder(orm, { id: "second", name: "同时乙", createdAt: 5 });

    expect(listFolders(orm).map((record) => record.id)).toEqual([
      "first",
      "second",
      "late",
    ]);
  });

  it("改名只改名称, 没有这个编号时返回 false", () => {
    const { orm } = getDatabase();
    insertFolder(orm, { id: "f-1", name: "旧", createdAt: 3 });

    expect(renameFolder(orm, "f-1", "新")).toBe(true);
    expect(renameFolder(orm, "missing", "新")).toBe(false);
    expect(findFolder(orm, "f-1")).toEqual({
      id: "f-1",
      name: "新",
      createdAt: 3,
    });
  });

  it("没有选文件夹总是有效, 选了就必须存在", () => {
    const { orm } = getDatabase();
    insertFolder(orm, { id: "f-1", name: "甲", createdAt: 1 });

    expect(isFolderChoiceValid(orm, undefined)).toBe(true);
    expect(isFolderChoiceValid(orm, "f-1")).toBe(true);
    expect(isFolderChoiceValid(orm, "missing")).toBe(false);
  });
});

describe("文件夹仓库: 条目归属与删除", () => {
  const getDatabase = useVaultDatabase("folder-repository-entries");

  it("设置条目所属文件夹, 也能清回未分类, 没有这个条目时返回 false", () => {
    const { orm } = getDatabase();
    insertEntry(orm, entryOf("e-1", null));

    expect(setEntryFolder(orm, "e-1", "f-1")).toBe(true);
    expect(findEntry(orm, "e-1")?.folderId).toBe("f-1");
    expect(setEntryFolder(orm, "e-1", null)).toBe(true);
    expect(findEntry(orm, "e-1")?.folderId).toBeNull();
    expect(setEntryFolder(orm, "missing", "f-1")).toBe(false);
  });

  it("删除文件夹把其中条目移到未分类, 条目与别的文件夹的条目都保留", () => {
    const { orm } = getDatabase();
    insertFolder(orm, { id: "f-1", name: "甲", createdAt: 1 });
    insertFolder(orm, { id: "f-2", name: "乙", createdAt: 2 });
    insertEntry(orm, entryOf("in-1", "f-1"));
    insertEntry(orm, entryOf("in-1-too", "f-1"));
    insertEntry(orm, entryOf("in-2", "f-2"));
    insertEntry(orm, entryOf("loose", null));

    const isDeleted = deleteFolderKeepingEntries(orm, "f-1");

    expect(isDeleted).toBe(true);
    expect(findFolder(orm, "f-1")).toBeUndefined();
    expect(findFolder(orm, "f-2")).toBeDefined();
    expect(findEntry(orm, "in-1")?.folderId).toBeNull();
    expect(findEntry(orm, "in-1-too")?.folderId).toBeNull();
    expect(findEntry(orm, "in-2")?.folderId).toBe("f-2");
    expect(findEntry(orm, "loose")?.folderId).toBeNull();
  });

  it("删除不存在的编号或重复删除返回 false", () => {
    const { orm } = getDatabase();
    insertFolder(orm, { id: "f-1", name: "甲", createdAt: 1 });

    expect(deleteFolderKeepingEntries(orm, "missing")).toBe(false);
    expect(deleteFolderKeepingEntries(orm, "f-1")).toBe(true);
    expect(deleteFolderKeepingEntries(orm, "f-1")).toBe(false);
  });
});
