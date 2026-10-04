import { describe, expect, it } from "vitest";

import {
  createBatchWorkspace,
  createNamedEntries,
  listEntryTagRows,
} from "../testing/batch-service-fixture";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";

describe("批量服务: 持久化", () => {
  const getHarness = useVaultServiceHarness();

  it("批量移入文件夹, 加标签, 摘标签与删除后关闭重开并解锁, 结果保持", async () => {
    const harness = getHarness();
    const vault = await startService(harness);
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const { batch, entries, folders, tags } = createBatchWorkspace(vault);
    createNamedEntries(entries, ["甲", "乙", "丙", "丁"]);
    folders.create("工作");
    tags.create("红", "red");
    tags.create("蓝", "blue");
    batch.moveEntries(["id-1", "id-2", "id-3"], "folder-1");
    batch.addTag(["id-1", "id-2", "id-3"], "tag-1");
    batch.addTag(["id-1", "id-2"], "tag-2");
    batch.removeTag(["id-2"], "tag-1");
    batch.removeEntries(["id-3"]);
    vault.close();

    const reopened = await startService(harness);
    await reopened.unlock(TEST_MASTER_PASSWORD);
    const after = createBatchWorkspace(reopened);

    const listed = after.entries.list();
    expect(
      listed.ok &&
        listed.value.map((entry) => [
          entry.name,
          entry.folderId ?? "none",
          entry.tagIds ?? [],
        ]),
    ).toEqual([
      ["丁", "none", []],
      ["乙", "folder-1", ["tag-2"]],
      ["甲", "folder-1", ["tag-1", "tag-2"]],
    ]);
    expect(listEntryTagRows(reopened)).toHaveLength(3);
  });
});
