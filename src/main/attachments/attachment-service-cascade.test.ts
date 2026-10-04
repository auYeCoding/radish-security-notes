import { describe, expect, it } from "vitest";

import {
  createAttachmentServiceFixture,
  createUnlockedAttachmentFixture,
  fileOf,
  listStoredAttachmentIds,
} from "../testing/attachment-service-fixture";
import {
  createBatchServiceFixture,
  createNamedEntries,
  insertBareEntries,
} from "../testing/batch-service-fixture";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";
import { insertAttachmentContent } from "./attachment-content-repository";
import { insertAttachmentRow } from "./attachment-repository";

/**
 * 条目编号超过一块的数目, 批量删除要分多块处理.
 */
const MULTI_CHUNK_ENTRY_COUNT = 1100;

describe("附件服务: 删除条目时附件随之清除", () => {
  const getHarness = useVaultServiceHarness();

  it("删除单个条目后它的附件元数据与内容都没有了, 别的条目的附件还在", async () => {
    const { attachments, entries, entryId, vault } =
      await createUnlockedAttachmentFixture(getHarness());
    const [otherId = ""] = createNamedEntries(entries, ["另一个"]);
    attachments.insertAll(entryId, [fileOf("甲.txt", 1), fileOf("乙.txt", 2)]);
    attachments.insertAll(otherId, [fileOf("丙.txt", 3)]);

    const removed = entries.remove(entryId);

    expect(removed).toEqual({ ok: true, value: undefined });
    expect(listStoredAttachmentIds(vault)).toEqual({
      metadata: ["att-3"],
      contents: ["att-3"],
    });
  });

  it("批量删除多个条目后它们的附件元数据与内容都没有了, 没删的条目的附件还在", async () => {
    const { attachments, entries, entryId, vault } =
      await createUnlockedAttachmentFixture(getHarness());
    const [secondId = "", keptId = ""] = createNamedEntries(entries, [
      "第二个",
      "保留的",
    ]);
    attachments.insertAll(entryId, [fileOf("甲.txt", 1)]);
    attachments.insertAll(secondId, [fileOf("乙.txt", 2)]);
    attachments.insertAll(keptId, [fileOf("丙.txt", 3)]);
    const { batch } = createBatchServiceFixture(vault);

    const removed = batch.removeEntries([entryId, secondId]);

    expect(removed).toEqual({ ok: true, value: undefined });
    expect(listStoredAttachmentIds(vault)).toEqual({
      metadata: ["att-3"],
      contents: ["att-3"],
    });
  });
});

describe("附件服务: 批量删除跨多块的条目", () => {
  const getHarness = useVaultServiceHarness();

  it("批量删除跨多块的条目时, 每个条目的附件都被清除", async () => {
    const { vault } = await createUnlockedAttachmentFixture(getHarness());
    const ids = insertBareEntries(vault, MULTI_CHUNK_ENTRY_COUNT);
    const orm = vault.getOrm();
    orm?.transaction((transaction) =>
      ids.forEach((entryId) => {
        const row = {
          id: `att-of-${entryId}`,
          entryId,
          name: "a.bin",
          size: 1,
          position: 0,
        };
        insertAttachmentRow(transaction, row);
        insertAttachmentContent(transaction, row.id, Buffer.from([1]));
      }),
    );
    const { batch } = createBatchServiceFixture(vault);

    const removed = batch.removeEntries(ids);

    expect(removed).toEqual({ ok: true, value: undefined });
    expect(listStoredAttachmentIds(vault)).toEqual({
      metadata: [],
      contents: [],
    });
  });
});

describe("附件服务: 重启后保持", () => {
  const getHarness = useVaultServiceHarness();

  it("关闭重开并解锁后附件名称, 大小与内容都还在, 删掉的附件仍然没有", async () => {
    const harness = getHarness();
    const { attachments, entryId, vault } =
      await createUnlockedAttachmentFixture(harness);
    const bytes = Array.from({ length: 300 }, (_, index) => index % 256);
    attachments.insertAll(entryId, [
      fileOf("证书-密钥(测试).pem", bytes),
      fileOf("要删.txt", 2),
    ]);
    attachments.remove("att-2");
    vault.close();

    const reopened = await startService(harness);
    await reopened.unlock(TEST_MASTER_PASSWORD);
    const after = createAttachmentServiceFixture(reopened);

    const listed = after.attachments.list(entryId);
    const read = after.attachments.read("att-1");
    expect(listed).toEqual({
      ok: true,
      value: [{ id: "att-1", name: "证书-密钥(测试).pem", size: 300 }],
    });
    expect(read.ok && read.value.content.equals(Buffer.from(bytes))).toBe(true);
    expect(listStoredAttachmentIds(reopened)).toEqual({
      metadata: ["att-1"],
      contents: ["att-1"],
    });
  });
});
