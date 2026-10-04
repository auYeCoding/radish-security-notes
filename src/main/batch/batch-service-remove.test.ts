import { describe, expect, it } from "vitest";

import { updateEntryInputOf } from "../testing/entry-service-fixture";
import {
  countEntryRows,
  createBatchServiceFixture,
  createNamedEntries,
  createUnlockedBatchFixture,
  insertBareEntries,
  listEntryTagRows,
} from "../testing/batch-service-fixture";
import { useVaultServiceHarness } from "../testing/vault-service-harness";

describe("批量服务: 批量删除", () => {
  const getHarness = useVaultServiceHarness();

  it("删除选中的条目, 其余条目保留, 被删条目的标签关联随之清除", async () => {
    const { batch, entries, tags, vault } =
      await createUnlockedBatchFixture(getHarness());
    createNamedEntries(entries, ["甲", "乙", "丙"]);
    tags.create("工作", "red");
    entries.update(
      "id-1",
      updateEntryInputOf({ name: "甲", tagIds: ["tag-1"] }),
    );
    entries.update(
      "id-2",
      updateEntryInputOf({ name: "乙", tagIds: ["tag-1"] }),
    );

    const result = batch.removeEntries(["id-1", "id-3"]);

    expect(result).toEqual({ ok: true, value: undefined });
    const listed = entries.list();
    expect(listed.ok && listed.value.map((entry) => entry.name)).toEqual([
      "乙",
    ]);
    expect(listEntryTagRows(vault)).toEqual([
      { entryId: "id-2", tagId: "tag-1", position: 0 },
    ]);
  });

  it("编号重复时只删一次, 仍算成功", async () => {
    const { batch, entries } = await createUnlockedBatchFixture(getHarness());
    createNamedEntries(entries, ["甲", "乙"]);

    const result = batch.removeEntries(["id-1", "id-1"]);

    expect(result).toEqual({ ok: true, value: undefined });
    const listed = entries.list();
    expect(listed.ok && listed.value.length).toBe(1);
  });

  it("超过一块 SQL 参数个数的大批量也能一次删完", async () => {
    const { batch, vault } = await createUnlockedBatchFixture(getHarness());
    const ids = insertBareEntries(vault, 1100);

    const result = batch.removeEntries(ids);

    expect(result).toEqual({ ok: true, value: undefined });
    expect(countEntryRows(vault)).toBe(0);
  });
});

describe("批量服务: 批量删除的失败", () => {
  const getHarness = useVaultServiceHarness();

  it("有条目不存在时整批失败, 存在的条目也不删除", async () => {
    const { batch, entries } = await createUnlockedBatchFixture(getHarness());
    createNamedEntries(entries, ["甲", "乙"]);

    const result = batch.removeEntries(["id-1", "missing"]);

    expect(result).toEqual({ ok: false, reason: "not-found" });
    const listed = entries.list();
    expect(listed.ok && listed.value.length).toBe(2);
  });

  it("没有编号时为输入不合规", async () => {
    const { batch } = await createUnlockedBatchFixture(getHarness());

    expect(batch.removeEntries([])).toEqual({
      ok: false,
      reason: "invalid-input",
    });
  });

  it("保险库未解锁时失败", async () => {
    const { vault } = await createUnlockedBatchFixture(getHarness());
    const { batch } = createBatchServiceFixture(vault, () => undefined);

    expect(batch.removeEntries(["id-1"])).toEqual({
      ok: false,
      reason: "vault-locked",
    });
  });
});
