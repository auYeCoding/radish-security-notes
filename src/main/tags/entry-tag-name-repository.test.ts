import { describe, expect, it } from "vitest";

import { insertEntry } from "../entries/entry-repository";
import {
  insertTagNamed,
  searchRecordOf,
} from "../testing/search-record-fixture";
import { useVaultDatabase } from "../testing/use-vault-database";
import { replaceEntryTags } from "./entry-tag-repository";
import { listTagNamesByEntry } from "./entry-tag-name-repository";

describe("listTagNamesByEntry", () => {
  const getDatabase = useVaultDatabase("entry-tag-name-repository");

  it("每个条目的标签名按选择顺序排列, 没有标签的条目不在结果里", () => {
    const { orm } = getDatabase();
    insertEntry(orm, searchRecordOf("a"));
    insertEntry(orm, searchRecordOf("b"));
    insertEntry(orm, searchRecordOf("c"));
    insertTagNamed(orm, "tag-1", "工作");
    insertTagNamed(orm, "tag-2", "Personal");
    replaceEntryTags(orm, "a", ["tag-2", "tag-1"]);
    replaceEntryTags(orm, "b", ["tag-1"]);

    const names = listTagNamesByEntry(orm);

    expect(names.get("a")).toEqual(["Personal", "工作"]);
    expect(names.get("b")).toEqual(["工作"]);
    expect(names.has("c")).toBe(false);
  });

  it("没有任何标签时是空映射", () => {
    const { orm } = getDatabase();
    insertEntry(orm, searchRecordOf("a"));

    expect(listTagNamesByEntry(orm).size).toBe(0);
  });
});
