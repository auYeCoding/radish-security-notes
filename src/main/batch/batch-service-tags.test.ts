import { describe, expect, it } from "vitest";

import { MAX_TAGS_PER_ENTRY } from "@shared/tags/tag-limits";

import {
  createNamedEntries,
  createUnlockedBatchFixture,
  listEntryTagRows,
  type BatchWorkspaceFixture,
} from "../testing/batch-service-fixture";
import { updateEntryInputOf } from "../testing/entry-service-fixture";
import { useVaultServiceHarness } from "../testing/vault-service-harness";

/**
 * 新建若干标签, 编号依次为 tag-1, tag-2.
 * @param workspace 批量服务环境.
 * @param count 标签个数.
 */
function createTags(workspace: BatchWorkspaceFixture, count: number): void {
  for (let index = 1; index <= count; index += 1) {
    workspace.tags.create(`标签${index}`, "red");
  }
}

describe("批量服务: 批量加标签", () => {
  const getHarness = useVaultServiceHarness();

  it("追加在条目原有标签之后, 返回每个条目现在带的标签", async () => {
    const workspace = await createUnlockedBatchFixture(getHarness());
    const { batch, entries } = workspace;
    createNamedEntries(entries, ["甲", "乙", "丙"]);
    createTags(workspace, 2);
    entries.update(
      "id-1",
      updateEntryInputOf({ name: "甲", tagIds: ["tag-1"] }),
    );

    const result = batch.addTag(["id-1", "id-2"], "tag-2");

    expect(result).toEqual({
      ok: true,
      value: [
        { entryId: "id-1", tagIds: ["tag-1", "tag-2"] },
        { entryId: "id-2", tagIds: ["tag-2"] },
      ],
    });
    expect(listEntryTagRows(workspace.vault)).toEqual([
      { entryId: "id-1", tagId: "tag-1", position: 0 },
      { entryId: "id-1", tagId: "tag-2", position: 1 },
      { entryId: "id-2", tagId: "tag-2", position: 0 },
    ]);
  });

  it("条目已带这个标签时保持不变, 位置也不动", async () => {
    const workspace = await createUnlockedBatchFixture(getHarness());
    const { batch, entries } = workspace;
    createNamedEntries(entries, ["甲"]);
    createTags(workspace, 2);
    entries.update(
      "id-1",
      updateEntryInputOf({ name: "甲", tagIds: ["tag-2", "tag-1"] }),
    );

    const result = batch.addTag(["id-1"], "tag-2");

    expect(result).toEqual({
      ok: true,
      value: [{ entryId: "id-1", tagIds: ["tag-2", "tag-1"] }],
    });
  });
});

describe("批量服务: 批量加标签的失败", () => {
  const getHarness = useVaultServiceHarness();

  it("任何一个条目追加后会超过标签数上限时整批失败, 其它条目也不加", async () => {
    const workspace = await createUnlockedBatchFixture(getHarness());
    const { batch, entries } = workspace;
    createNamedEntries(entries, ["满", "空"]);
    createTags(workspace, MAX_TAGS_PER_ENTRY + 1);
    const fullTagIds = Array.from(
      { length: MAX_TAGS_PER_ENTRY },
      (_, index) => `tag-${index + 1}`,
    );
    entries.update(
      "id-1",
      updateEntryInputOf({ name: "满", tagIds: fullTagIds }),
    );

    const result = batch.addTag(
      ["id-2", "id-1"],
      `tag-${MAX_TAGS_PER_ENTRY + 1}`,
    );

    expect(result).toEqual({ ok: false, reason: "tag-limit-exceeded" });
    expect(
      listEntryTagRows(workspace.vault).filter((row) => row.entryId === "id-2"),
    ).toEqual([]);
  });

  it("标签或条目不存在, 或没有编号时整批失败", async () => {
    const workspace = await createUnlockedBatchFixture(getHarness());
    const { batch, entries } = workspace;
    createNamedEntries(entries, ["甲"]);
    createTags(workspace, 1);

    expect(batch.addTag(["id-1"], "missing")).toEqual({
      ok: false,
      reason: "tag-not-found",
    });
    expect(batch.addTag(["id-1", "missing"], "tag-1")).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(batch.addTag([], "tag-1")).toEqual({
      ok: false,
      reason: "invalid-input",
    });
    expect(listEntryTagRows(workspace.vault)).toEqual([]);
  });
});

describe("批量服务: 批量摘标签", () => {
  const getHarness = useVaultServiceHarness();

  it("只摘掉指定的标签, 其余标签保持原有顺序, 没带它的条目不受影响", async () => {
    const workspace = await createUnlockedBatchFixture(getHarness());
    const { batch, entries } = workspace;
    createNamedEntries(entries, ["甲", "乙", "丙"]);
    createTags(workspace, 3);
    entries.update(
      "id-1",
      updateEntryInputOf({ name: "甲", tagIds: ["tag-1", "tag-2", "tag-3"] }),
    );
    entries.update(
      "id-2",
      updateEntryInputOf({ name: "乙", tagIds: ["tag-1"] }),
    );

    const result = batch.removeTag(["id-1", "id-2", "id-3"], "tag-2");

    expect(result).toEqual({
      ok: true,
      value: [
        { entryId: "id-1", tagIds: ["tag-1", "tag-3"] },
        { entryId: "id-2", tagIds: ["tag-1"] },
        { entryId: "id-3", tagIds: [] },
      ],
    });
    expect(listEntryTagRows(workspace.vault)).toEqual([
      { entryId: "id-1", tagId: "tag-1", position: 0 },
      { entryId: "id-1", tagId: "tag-3", position: 1 },
      { entryId: "id-2", tagId: "tag-1", position: 0 },
    ]);
  });
});

describe("批量服务: 批量摘标签的失败", () => {
  const getHarness = useVaultServiceHarness();

  it("标签或条目不存在, 或没有编号时整批失败, 关联不变", async () => {
    const workspace = await createUnlockedBatchFixture(getHarness());
    const { batch, entries } = workspace;
    createNamedEntries(entries, ["甲"]);
    createTags(workspace, 1);
    entries.update(
      "id-1",
      updateEntryInputOf({ name: "甲", tagIds: ["tag-1"] }),
    );

    expect(batch.removeTag(["id-1"], "missing")).toEqual({
      ok: false,
      reason: "tag-not-found",
    });
    expect(batch.removeTag(["id-1", "missing"], "tag-1")).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(batch.removeTag([], "tag-1")).toEqual({
      ok: false,
      reason: "invalid-input",
    });
    expect(listEntryTagRows(workspace.vault)).toEqual([
      { entryId: "id-1", tagId: "tag-1", position: 0 },
    ]);
  });
});
