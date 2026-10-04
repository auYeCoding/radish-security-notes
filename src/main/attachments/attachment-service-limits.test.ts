import { describe, expect, it } from "vitest";

import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_ENTRY,
  MAX_ENTRY_ATTACHMENT_BYTES,
} from "@shared/attachments/attachment-limits";

import { entryAttachments } from "../vault/database/attachment-schema";
import {
  createAttachmentServiceFixture,
  createUnlockedAttachmentFixture,
  fileOf,
  listStoredAttachmentIds,
} from "../testing/attachment-service-fixture";
import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";

describe("附件服务: 单个文件的限制", () => {
  const getHarness = useVaultServiceHarness();

  it("空文件被拒绝, 带文件名, 什么都没有写入", async () => {
    const { attachments, entryId, vault } =
      await createUnlockedAttachmentFixture(getHarness());

    const result = attachments.insertAll(entryId, [fileOf("空.txt", 0)]);

    expect(result).toEqual({
      ok: false,
      reason: "empty-file",
      fileName: "空.txt",
    });
    expect(listStoredAttachmentIds(vault)).toEqual({
      metadata: [],
      contents: [],
    });
  });

  it("恰好等于单个上限的文件可以添加, 超过一个字节被拒绝", async () => {
    const { attachments, entryId } =
      await createUnlockedAttachmentFixture(getHarness());

    const exact = attachments.insertAll(entryId, [
      fileOf("恰好.bin", MAX_ATTACHMENT_BYTES),
    ]);
    const over = attachments.insertAll(entryId, [
      fileOf("过大.bin", MAX_ATTACHMENT_BYTES + 1),
    ]);

    expect(exact.ok).toBe(true);
    expect(over).toEqual({
      ok: false,
      reason: "file-too-large",
      fileName: "过大.bin",
    });
  });

  it("一批里有一个不合规整批都不写入, 提示第一个不合规的文件", async () => {
    const { attachments, entryId, vault } =
      await createUnlockedAttachmentFixture(getHarness());

    const result = attachments.insertAll(entryId, [
      fileOf("好.txt", 1),
      fileOf("先空.txt", 0),
      fileOf("后大.bin", MAX_ATTACHMENT_BYTES + 1),
    ]);

    expect(result).toEqual({
      ok: false,
      reason: "empty-file",
      fileName: "先空.txt",
    });
    expect(listStoredAttachmentIds(vault).metadata).toEqual([]);
  });
});

describe("附件服务: 条目的个数与总大小限制", () => {
  const getHarness = useVaultServiceHarness();

  it("加到恰好 20 个可以, 再多一个被拒绝, 已有的附件不受影响", async () => {
    const { attachments, entryId, vault } =
      await createUnlockedAttachmentFixture(getHarness());
    const twenty = Array.from({ length: MAX_ATTACHMENTS_PER_ENTRY }, (_, i) =>
      fileOf(`f-${i}.txt`, 1),
    );

    const full = attachments.insertAll(entryId, twenty);
    const extra = attachments.insertAll(entryId, [fileOf("多.txt", 1)]);

    expect(full.ok).toBe(true);
    expect(extra).toEqual({ ok: false, reason: "too-many-attachments" });
    expect(listStoredAttachmentIds(vault).metadata).toHaveLength(
      MAX_ATTACHMENTS_PER_ENTRY,
    );
  });

  it("一次添加的个数加上已有的超过 20 个时整批被拒绝", async () => {
    const { attachments, entryId, vault } =
      await createUnlockedAttachmentFixture(getHarness());
    attachments.insertAll(entryId, [fileOf("已有.txt", 1)]);
    const twenty = Array.from({ length: MAX_ATTACHMENTS_PER_ENTRY }, (_, i) =>
      fileOf(`f-${i}.txt`, 1),
    );

    const result = attachments.insertAll(entryId, twenty);

    expect(result).toEqual({ ok: false, reason: "too-many-attachments" });
    expect(listStoredAttachmentIds(vault).metadata).toEqual(["att-1"]);
  });
});

describe("附件服务: 条目的总大小限制", () => {
  const getHarness = useVaultServiceHarness();

  it("加上新文件后总大小超过 100 MiB 时被拒绝, 恰好等于时可以", async () => {
    const { attachments, entryId, vault } =
      await createUnlockedAttachmentFixture(getHarness());
    const room = 1000;
    vault
      .getOrm()
      ?.insert(entryAttachments)
      .values({
        id: "stored",
        entryId,
        name: "占位.bin",
        size: MAX_ENTRY_ATTACHMENT_BYTES - room,
        position: 0,
      })
      .run();

    const over = attachments.insertAll(entryId, [fileOf("超.bin", room + 1)]);
    const exact = attachments.insertAll(entryId, [fileOf("恰.bin", room)]);

    expect(over).toEqual({ ok: false, reason: "total-too-large" });
    expect(exact.ok).toBe(true);
  });

  it("读取文件之前的预检按个数与总大小挡掉过大的批次", async () => {
    const { attachments, entryId } =
      await createUnlockedAttachmentFixture(getHarness());
    const bigFiles = Array.from({ length: 5 }, (_, index) => ({
      name: `大-${index}.bin`,
      size: MAX_ATTACHMENT_BYTES,
    }));

    expect(attachments.checkCapacity(entryId, bigFiles)).toEqual({
      ok: false,
      reason: "total-too-large",
    });
    expect(
      attachments.checkCapacity(entryId, [{ name: "小.txt", size: 1 }]),
    ).toEqual({ ok: true, value: undefined });
  });
});

describe("附件服务: 输入与状态检查", () => {
  const getHarness = useVaultServiceHarness();

  it("没有这个条目时添加与预检都失败", async () => {
    const { attachments } = await createUnlockedAttachmentFixture(getHarness());

    expect(attachments.insertAll("missing", [fileOf("a.txt", 1)])).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(
      attachments.checkCapacity("missing", [{ name: "a.txt", size: 1 }]),
    ).toEqual({ ok: false, reason: "not-found" });
  });

  it("没有文件时添加失败", async () => {
    const { attachments, entryId } =
      await createUnlockedAttachmentFixture(getHarness());

    expect(attachments.insertAll(entryId, [])).toEqual({
      ok: false,
      reason: "invalid-input",
    });
  });

  it("保险库未解锁时各操作都返回 vault-locked", async () => {
    const vault = await startService(getHarness());
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const { attachments } = createAttachmentServiceFixture(
      vault,
      () => undefined,
    );
    const locked = { ok: false, reason: "vault-locked" };

    expect(attachments.list("id-1")).toEqual(locked);
    expect(attachments.insertAll("id-1", [fileOf("a.txt", 1)])).toEqual(locked);
    expect(attachments.read("att-1")).toEqual(locked);
    expect(attachments.remove("att-1")).toEqual(locked);
  });
});
