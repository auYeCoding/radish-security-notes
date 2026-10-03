import { describe, expect, it } from "vitest";

import { insertEntry, type EntryRecord } from "../entries/entry-repository";
import { useVaultDatabase } from "../testing/use-vault-database";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import {
  areAllTagsExisting,
  listTagIdsByEntry,
  listTagIdsOfEntry,
  replaceEntryTags,
} from "./entry-tag-repository";
import {
  deleteTag,
  findTag,
  insertTag,
  listTags,
  updateTag,
} from "./tag-repository";

/**
 * 构造一个测试用的条目行.
 * @param id 条目编号.
 * @returns 条目行.
 */
function entryOf(id: string): EntryRecord {
  return {
    id,
    name: `name-${id}`,
    type: "login",
    fields: {},
    notes: "",
    customFields: [],
    totp: null,
    folderId: null,
    createdAt: 1,
  };
}

describe("标签仓库: 读写", () => {
  const getDatabase = useVaultDatabase("tag-repository");

  it("插入的标签能按编号读回, 没有这个编号时读不到", () => {
    const { orm } = getDatabase();
    insertTag(orm, { id: "t-1", name: "工作", color: "red", createdAt: 1 });

    expect(findTag(orm, "t-1")).toEqual({
      id: "t-1",
      name: "工作",
      color: "red",
      createdAt: 1,
    });
    expect(findTag(orm, "missing")).toBeUndefined();
  });

  it("列表按创建时间从旧到新, 创建时间相同时先插入的在前", () => {
    const { orm } = getDatabase();
    insertTag(orm, { id: "late", name: "晚", color: "red", createdAt: 9 });
    insertTag(orm, { id: "first", name: "甲", color: "red", createdAt: 5 });
    insertTag(orm, { id: "second", name: "乙", color: "red", createdAt: 5 });

    expect(listTags(orm).map((record) => record.id)).toEqual([
      "first",
      "second",
      "late",
    ]);
  });

  it("修改只改名称与颜色, 没有这个编号时返回 false", () => {
    const { orm } = getDatabase();
    insertTag(orm, { id: "t-1", name: "旧", color: "red", createdAt: 3 });

    expect(updateTag(orm, "t-1", "新", "blue")).toBe(true);
    expect(updateTag(orm, "missing", "新", "blue")).toBe(false);
    expect(findTag(orm, "t-1")).toEqual({
      id: "t-1",
      name: "新",
      color: "blue",
      createdAt: 3,
    });
  });

  it("删除标签后读不到, 没有这个编号时返回 false", () => {
    const { orm } = getDatabase();
    insertTag(orm, { id: "t-1", name: "甲", color: "red", createdAt: 1 });

    expect(deleteTag(orm, "t-1")).toBe(true);
    expect(deleteTag(orm, "t-1")).toBe(false);
    expect(findTag(orm, "t-1")).toBeUndefined();
  });
});

/**
 * 在数据库里写入两个条目与三个标签.
 * @param orm 已迁移数据库的查询入口.
 */
function seed(orm: VaultOrm): void {
  insertEntry(orm, entryOf("e-1"));
  insertEntry(orm, entryOf("e-2"));
  insertTag(orm, { id: "t-1", name: "甲", color: "red", createdAt: 1 });
  insertTag(orm, { id: "t-2", name: "乙", color: "blue", createdAt: 2 });
  insertTag(orm, { id: "t-3", name: "丙", color: "green", createdAt: 3 });
}

describe("条目标签仓库", () => {
  const getDatabase = useVaultDatabase("entry-tag-repository");

  it("整组替换后按给定顺序读回, 再替换时旧的关联被清掉", () => {
    const { orm } = getDatabase();
    seed(orm);

    replaceEntryTags(orm, "e-1", ["t-3", "t-1"]);
    expect(listTagIdsOfEntry(orm, "e-1")).toEqual(["t-3", "t-1"]);

    replaceEntryTags(orm, "e-1", ["t-2"]);
    expect(listTagIdsOfEntry(orm, "e-1")).toEqual(["t-2"]);

    replaceEntryTags(orm, "e-1", []);
    expect(listTagIdsOfEntry(orm, "e-1")).toEqual([]);
  });

  it("listTagIdsByEntry 按条目分组, 每组按选择顺序, 没有标签的条目不在结果里", () => {
    const { orm } = getDatabase();
    seed(orm);
    replaceEntryTags(orm, "e-1", ["t-2", "t-1"]);

    const grouped = listTagIdsByEntry(orm);

    expect(grouped.get("e-1")).toEqual(["t-2", "t-1"]);
    expect(grouped.has("e-2")).toBe(false);
  });

  it("areAllTagsExisting 空列表总是有效, 有不存在的标签时无效", () => {
    const { orm } = getDatabase();
    seed(orm);

    expect(areAllTagsExisting(orm, [])).toBe(true);
    expect(areAllTagsExisting(orm, ["t-1", "t-3"])).toBe(true);
    expect(areAllTagsExisting(orm, ["t-1", "missing"])).toBe(false);
  });

  it("删除标签后条目上的它被摘掉, 别的标签与条目不受影响", () => {
    const { orm } = getDatabase();
    seed(orm);
    replaceEntryTags(orm, "e-1", ["t-1", "t-2"]);
    replaceEntryTags(orm, "e-2", ["t-1"]);

    deleteTag(orm, "t-1");

    expect(listTagIdsOfEntry(orm, "e-1")).toEqual(["t-2"]);
    expect(listTagIdsOfEntry(orm, "e-2")).toEqual([]);
  });
});
