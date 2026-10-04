import { describe, expect, it } from "vitest";

import {
  createUnlockedAttachmentFixture,
  fileOf,
  listStoredAttachmentIds,
} from "../testing/attachment-service-fixture";
import { useVaultServiceHarness } from "../testing/vault-service-harness";

describe("附件服务: 添加与列出", () => {
  const getHarness = useVaultServiceHarness();

  it("一次添加多个文件, 按添加顺序列出编号, 名称与大小, 不含内容", async () => {
    const { attachments, entryId } =
      await createUnlockedAttachmentFixture(getHarness());

    const added = attachments.insertAll(entryId, [
      fileOf("证书-密钥(测试).pem", [1, 2, 3]),
      fileOf("截图 2026年.png", 5),
    ]);

    const expected = [
      { id: "att-1", name: "证书-密钥(测试).pem", size: 3 },
      { id: "att-2", name: "截图 2026年.png", size: 5 },
    ];
    expect(added).toEqual({ ok: true, value: expected });
    expect(attachments.list(entryId)).toEqual({ ok: true, value: expected });
  });

  it("后添加的文件接在已有附件之后, 同名附件并存且各有编号", async () => {
    const { attachments, entryId } =
      await createUnlockedAttachmentFixture(getHarness());

    attachments.insertAll(entryId, [fileOf("image.png", 1)]);
    attachments.insertAll(entryId, [
      fileOf("image.png", 2),
      fileOf("恢复码.txt", 3),
    ]);

    const listed = attachments.list(entryId);
    expect(
      listed.ok && listed.value.map((item) => [item.id, item.name]),
    ).toEqual([
      ["att-1", "image.png"],
      ["att-2", "image.png"],
      ["att-3", "恢复码.txt"],
    ]);
  });
});

describe("附件服务: 列出", () => {
  const getHarness = useVaultServiceHarness();

  it("没有附件的条目列出空数组, 没有这个条目时失败", async () => {
    const { attachments, entryId } =
      await createUnlockedAttachmentFixture(getHarness());

    expect(attachments.list(entryId)).toEqual({ ok: true, value: [] });
    expect(attachments.list("missing")).toEqual({
      ok: false,
      reason: "not-found",
    });
  });

  it("每个条目只列出自己的附件", async () => {
    const { attachments, entries, entryId } =
      await createUnlockedAttachmentFixture(getHarness());
    const other = entries.create({
      type: "login",
      name: "另一个",
      fields: { account: "", password: "", url: "" },
      notes: "",
      customFields: [],
      totp: "",
    });
    const otherId = other.ok ? other.value.id : "";

    attachments.insertAll(entryId, [fileOf("甲.txt", 1)]);
    attachments.insertAll(otherId, [fileOf("乙.txt", 2)]);

    const own = attachments.list(entryId);
    const others = attachments.list(otherId);
    expect(own.ok && own.value.map((item) => item.name)).toEqual(["甲.txt"]);
    expect(others.ok && others.value.map((item) => item.name)).toEqual([
      "乙.txt",
    ]);
  });
});

describe("附件服务: 读出与删除", () => {
  const getHarness = useVaultServiceHarness();

  it("读回的内容与写入的字节逐字节一致, 含全部 256 种字节值", async () => {
    const { attachments, entryId } =
      await createUnlockedAttachmentFixture(getHarness());
    const bytes = Array.from({ length: 256 }, (_, value) => value);
    attachments.insertAll(entryId, [fileOf("全部字节.bin", bytes)]);

    const read = attachments.read("att-1");

    expect(read.ok && read.value.meta).toEqual({
      id: "att-1",
      name: "全部字节.bin",
      size: 256,
    });
    expect(read.ok && read.value.content.equals(Buffer.from(bytes))).toBe(true);
  });

  it("只读元数据时不含内容, 附件不存在时失败", async () => {
    const { attachments, entryId } =
      await createUnlockedAttachmentFixture(getHarness());
    attachments.insertAll(entryId, [fileOf("甲.txt", 4)]);

    expect(attachments.findMeta("att-1")).toEqual({
      ok: true,
      value: { id: "att-1", name: "甲.txt", size: 4 },
    });
    expect(attachments.findMeta("missing")).toEqual({
      ok: false,
      reason: "not-found",
    });
  });

  it("读取不存在的附件时失败", async () => {
    const { attachments } = await createUnlockedAttachmentFixture(getHarness());

    expect(attachments.read("missing")).toEqual({
      ok: false,
      reason: "not-found",
    });
  });
});

describe("附件服务: 删除", () => {
  const getHarness = useVaultServiceHarness();

  it("删除一个附件后元数据与内容都没有了, 别的附件不受影响", async () => {
    const { attachments, entryId, vault } =
      await createUnlockedAttachmentFixture(getHarness());
    attachments.insertAll(entryId, [fileOf("甲.txt", 1), fileOf("乙.txt", 2)]);

    const removed = attachments.remove("att-1");

    expect(removed).toEqual({ ok: true, value: undefined });
    expect(listStoredAttachmentIds(vault)).toEqual({
      metadata: ["att-2"],
      contents: ["att-2"],
    });
    expect(attachments.read("att-1")).toEqual({
      ok: false,
      reason: "not-found",
    });
  });

  it("删除不存在的附件时失败", async () => {
    const { attachments } = await createUnlockedAttachmentFixture(getHarness());

    expect(attachments.remove("missing")).toEqual({
      ok: false,
      reason: "not-found",
    });
  });
});
