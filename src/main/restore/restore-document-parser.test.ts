import { describe, expect, it } from "vitest";

import { MAX_TRANSFER_ENTRIES } from "@shared/data-transfer/transfer-limits";

import { loadSampleBackup } from "../testing/restore-sample-backup";
import { useVaultDatabase } from "../testing/use-vault-database";
import { parseVaultDocument } from "./restore-document-parser";

/**
 * 把值写成保险库数据文件的字节.
 * @param value 保险库数据.
 * @returns 字节.
 */
function bytesOf(value: unknown): Buffer {
  return Buffer.from(JSON.stringify(value), "utf8");
}

describe("保险库数据结构解析: 合规与顶层结构", () => {
  const getDatabase = useVaultDatabase("restore-document-parser-top");

  it("真实导出的保险库数据解析成四个区段, 内容原样保留", async () => {
    const { vault } = await loadSampleBackup(getDatabase().orm);

    const parsed = parseVaultDocument(bytesOf(vault));

    expect(parsed.ok && parsed.value).toEqual(vault);
  });

  it("不是 JSON, 不是对象或缺少区段时按压缩包结构不对拒绝", async () => {
    const { vault } = await loadSampleBackup(getDatabase().orm);
    const missingTags = { ...vault, tags: undefined };

    for (const bytes of [
      Buffer.from("not json"),
      bytesOf([]),
      bytesOf(missingTags),
    ]) {
      expect(parseVaultDocument(bytes)).toEqual({
        ok: false,
        reason: "invalid-content",
        problem: { section: "archive", code: "wrong-shape" },
      });
    }
  });
});

describe("保险库数据结构解析: 区段里某一项", () => {
  const getDatabase = useVaultDatabase("restore-document-parser-items");

  it("文件夹与标签的某一项结构不对时指出是第几项", async () => {
    const { vault } = await loadSampleBackup(getDatabase().orm);
    const badFolders = { ...vault, folders: [vault.folders[0], { id: "x" }] };
    const badTag = { ...vault.tags[0], color: "no-such-color" };

    expect(parseVaultDocument(bytesOf(badFolders))).toMatchObject({
      problem: { section: "folders", code: "wrong-shape", position: 2 },
    });
    expect(
      parseVaultDocument(bytesOf({ ...vault, tags: [badTag] })),
    ).toMatchObject({
      problem: { section: "tags", code: "wrong-shape", position: 1 },
    });
  });

  it("自定义类型与条目的某一项结构不对时指出是第几项", async () => {
    const { vault } = await loadSampleBackup(getDatabase().orm);
    const badType = { ...vault.customEntryTypes[0], fields: "none" };
    const badEntry = { ...vault.entries[2], tagIds: 5 };
    const entries = [vault.entries[0], vault.entries[1], badEntry];

    expect(
      parseVaultDocument(bytesOf({ ...vault, customEntryTypes: [badType] })),
    ).toMatchObject({
      problem: { section: "customTypes", code: "wrong-shape", position: 1 },
    });
    expect(parseVaultDocument(bytesOf({ ...vault, entries }))).toMatchObject({
      problem: { section: "entries", code: "wrong-shape", position: 3 },
    });
  });
});

describe("保险库数据结构解析: 条目的取值与个数", () => {
  const getDatabase = useVaultDatabase("restore-document-parser-values");

  it("TOTP 位数, 算法, 备注格式与创建时间必须是支持的取值", async () => {
    const { vault } = await loadSampleBackup(getDatabase().orm);
    const [login] = vault.entries;

    for (const broken of [
      { ...login, totp: { ...login.totp, digits: 7 } },
      { ...login, totp: { ...login.totp, algorithm: "MD5" } },
      { ...login, notesFormat: "html" },
      { ...login, createdAt: -1 },
      { ...login, createdAt: 1.5 },
      { ...login, fields: { account: 5 } },
    ]) {
      expect(
        parseVaultDocument(bytesOf({ ...vault, entries: [broken] })),
      ).toMatchObject({
        problem: { section: "entries", code: "wrong-shape", position: 1 },
      });
    }
  });

  it("条目个数超过上限时在逐项校验之前就拒绝", async () => {
    const { vault } = await loadSampleBackup(getDatabase().orm);
    const tooMany = Array.from({ length: MAX_TRANSFER_ENTRIES + 1 }, () => 0);

    expect(parseVaultDocument(bytesOf({ ...vault, entries: tooMany }))).toEqual(
      {
        ok: false,
        reason: "limit-exceeded",
        problem: { section: "entries", code: "too-many-entries" },
      },
    );
  });
});
