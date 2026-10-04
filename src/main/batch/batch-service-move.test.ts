import { describe, expect, it } from "vitest";

import {
  createNamedEntries,
  createUnlockedBatchFixture,
  insertBareEntries,
} from "../testing/batch-service-fixture";
import { useVaultServiceHarness } from "../testing/vault-service-harness";

describe("批量服务: 批量移入文件夹", () => {
  const getHarness = useVaultServiceHarness();

  it("选中的条目都放进目标文件夹, 其余条目不动", async () => {
    const { batch, entries, folders } =
      await createUnlockedBatchFixture(getHarness());
    createNamedEntries(entries, ["甲", "乙", "丙"]);
    folders.create("工作");

    const result = batch.moveEntries(["id-1", "id-3"], "folder-1");

    expect(result).toEqual({ ok: true, value: undefined });
    const listed = entries.list();
    expect(
      listed.ok &&
        listed.value.map((entry) => [entry.name, entry.folderId ?? "none"]),
    ).toEqual([
      ["丙", "folder-1"],
      ["乙", "none"],
      ["甲", "folder-1"],
    ]);
  });

  it("目标是 undefined 时移回未分类", async () => {
    const { batch, entries, folders } =
      await createUnlockedBatchFixture(getHarness());
    createNamedEntries(entries, ["甲", "乙"]);
    folders.create("工作");
    batch.moveEntries(["id-1", "id-2"], "folder-1");

    const result = batch.moveEntries(["id-1", "id-2"], undefined);

    expect(result).toEqual({ ok: true, value: undefined });
    const listed = entries.list();
    expect(listed.ok && listed.value.map((entry) => entry.folderId)).toEqual([
      undefined,
      undefined,
    ]);
  });

  it("超过一块 SQL 参数个数的大批量也能一次移完", async () => {
    const { batch, entries, folders, vault } =
      await createUnlockedBatchFixture(getHarness());
    folders.create("工作");
    const ids = insertBareEntries(vault, 1100);

    const result = batch.moveEntries(ids, "folder-1");

    expect(result).toEqual({ ok: true, value: undefined });
    const listed = entries.list();
    expect(
      listed.ok && listed.value.every((entry) => entry.folderId === "folder-1"),
    ).toBe(true);
  });
});

describe("批量服务: 批量移入文件夹的失败", () => {
  const getHarness = useVaultServiceHarness();

  it("目标文件夹不存在时整批失败, 条目不动", async () => {
    const { batch, entries } = await createUnlockedBatchFixture(getHarness());
    createNamedEntries(entries, ["甲"]);

    const result = batch.moveEntries(["id-1"], "missing");

    expect(result).toEqual({ ok: false, reason: "folder-not-found" });
    const listed = entries.list();
    expect(listed.ok && listed.value[0]?.folderId).toBeUndefined();
  });

  it("有条目不存在时整批失败, 存在的条目也不动", async () => {
    const { batch, entries, folders } =
      await createUnlockedBatchFixture(getHarness());
    createNamedEntries(entries, ["甲"]);
    folders.create("工作");

    const result = batch.moveEntries(["id-1", "missing"], "folder-1");

    expect(result).toEqual({ ok: false, reason: "not-found" });
    const listed = entries.list();
    expect(listed.ok && listed.value[0]?.folderId).toBeUndefined();
  });

  it("没有编号时为输入不合规", async () => {
    const { batch } = await createUnlockedBatchFixture(getHarness());

    expect(batch.moveEntries([], undefined)).toEqual({
      ok: false,
      reason: "invalid-input",
    });
  });
});
