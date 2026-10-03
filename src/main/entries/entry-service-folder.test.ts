import { describe, expect, it } from "vitest";

import {
  detailOf,
  newEntryInputOf,
  updateEntryInputOf,
} from "../testing/entry-service-fixture";
import { createUnlockedFolderAndEntryFixture } from "../testing/folder-service-fixture";
import { useVaultServiceHarness } from "../testing/vault-service-harness";

describe("条目服务: 新建时选文件夹", () => {
  const getHarness = useVaultServiceHarness();

  it("选了存在的文件夹时详情与摘要都带所属, 不选时没有所属", async () => {
    const { folders, entries } =
      await createUnlockedFolderAndEntryFixture(getHarness());
    folders.create("甲");

    const filed = entries.create(
      newEntryInputOf({ name: "归档", folderId: "folder-1" }),
    );
    const loose = entries.create(newEntryInputOf({ name: "散件" }));

    expect(filed).toEqual({
      ok: true,
      value: detailOf({ name: "归档", folderId: "folder-1" }),
    });
    expect(loose).toEqual({
      ok: true,
      value: detailOf({ id: "id-2", name: "散件" }),
    });
    const listed = entries.list();
    expect(listed.ok && listed.value.map((entry) => entry.folderId)).toEqual([
      undefined,
      "folder-1",
    ]);
  });

  it("所选文件夹不存在时失败, 且不写入", async () => {
    const { entries } = await createUnlockedFolderAndEntryFixture(getHarness());

    const result = entries.create(
      newEntryInputOf({ name: "归档", folderId: "missing" }),
    );

    expect(result).toEqual({ ok: false, reason: "folder-not-found" });
    expect(entries.list()).toEqual({ ok: true, value: [] });
  });
});

describe("条目服务: 编辑时改文件夹", () => {
  const getHarness = useVaultServiceHarness();

  it("改到另一个文件夹, 省略所属则移回未分类, 其余内容不变", async () => {
    const { folders, entries } =
      await createUnlockedFolderAndEntryFixture(getHarness());
    folders.create("甲");
    folders.create("乙");
    entries.create(newEntryInputOf({ name: "条目", folderId: "folder-1" }));

    const moved = entries.update(
      "id-1",
      updateEntryInputOf({ folderId: "folder-2" }),
    );
    const cleared = entries.update("id-1", updateEntryInputOf());

    expect(moved).toEqual({
      ok: true,
      value: detailOf({ folderId: "folder-2" }),
    });
    expect(cleared).toEqual({ ok: true, value: detailOf() });
    const detail = entries.get("id-1");
    expect(detail.ok && detail.value.folderId).toBeUndefined();
  });

  it("所选文件夹不存在时失败, 条目保持原来的所属与内容", async () => {
    const { folders, entries } =
      await createUnlockedFolderAndEntryFixture(getHarness());
    folders.create("甲");
    entries.create(newEntryInputOf({ name: "原名", folderId: "folder-1" }));

    const result = entries.update(
      "id-1",
      updateEntryInputOf({ name: "新名", folderId: "missing" }),
    );

    expect(result).toEqual({ ok: false, reason: "folder-not-found" });
    expect(entries.get("id-1")).toEqual({
      ok: true,
      value: detailOf({ name: "原名", folderId: "folder-1" }),
    });
  });
});
