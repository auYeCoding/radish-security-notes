import { describe, expect, it } from "vitest";

import { newEntryInputOf } from "../testing/entry-service-fixture";
import { createUnlockedFolderAndEntryFixture } from "../testing/folder-service-fixture";
import { useVaultServiceHarness } from "../testing/vault-service-harness";

describe("文件夹服务: 删除文件夹", () => {
  const getHarness = useVaultServiceHarness();

  it("其中的条目全部移到未分类并保留, 别的文件夹与条目不受影响", async () => {
    const { folders, entries } =
      await createUnlockedFolderAndEntryFixture(getHarness());
    folders.create("甲");
    folders.create("乙");
    entries.create(newEntryInputOf({ name: "甲一", folderId: "folder-1" }));
    entries.create(newEntryInputOf({ name: "甲二", folderId: "folder-1" }));
    entries.create(newEntryInputOf({ name: "乙一", folderId: "folder-2" }));
    entries.create(newEntryInputOf({ name: "散件" }));

    const removed = folders.remove("folder-1");

    expect(removed).toEqual({ ok: true, value: undefined });
    expect(folders.list()).toEqual({
      ok: true,
      value: [{ id: "folder-2", name: "乙" }],
    });
    const listed = entries.list();
    expect(
      listed.ok &&
        listed.value.map((entry) => [entry.name, entry.folderId ?? "none"]),
    ).toEqual([
      ["散件", "none"],
      ["乙一", "folder-2"],
      ["甲二", "none"],
      ["甲一", "none"],
    ]);
  });

  it("没有这个编号或重复删除时为未找到", async () => {
    const { folders } = await createUnlockedFolderAndEntryFixture(getHarness());
    folders.create("甲");

    expect(folders.remove("missing")).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(folders.remove("folder-1").ok).toBe(true);
    expect(folders.remove("folder-1")).toEqual({
      ok: false,
      reason: "not-found",
    });
  });
});

describe("文件夹服务: 把条目放进文件夹", () => {
  const getHarness = useVaultServiceHarness();

  it("放进文件夹后条目带上所属, 移出后回到未分类", async () => {
    const { folders, entries } =
      await createUnlockedFolderAndEntryFixture(getHarness());
    folders.create("甲");
    entries.create(newEntryInputOf({ name: "条目" }));

    const assigned = folders.assignEntry("id-1", "folder-1");
    const detail = entries.get("id-1");

    expect(assigned).toEqual({ ok: true, value: undefined });
    expect(detail.ok && detail.value.folderId).toBe("folder-1");
    expect(folders.assignEntry("id-1", undefined).ok).toBe(true);
    const cleared = entries.get("id-1");
    expect(cleared.ok && cleared.value.folderId).toBeUndefined();
  });

  it("没有这个条目或目标文件夹不存在时为未找到, 条目的所属不变", async () => {
    const { folders, entries } =
      await createUnlockedFolderAndEntryFixture(getHarness());
    folders.create("甲");
    entries.create(newEntryInputOf({ name: "条目", folderId: "folder-1" }));

    expect(folders.assignEntry("missing", "folder-1")).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(folders.assignEntry("id-1", "missing")).toEqual({
      ok: false,
      reason: "not-found",
    });
    const detail = entries.get("id-1");
    expect(detail.ok && detail.value.folderId).toBe("folder-1");
  });
});
