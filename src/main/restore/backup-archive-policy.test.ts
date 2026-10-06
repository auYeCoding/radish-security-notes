import { describe, expect, it } from "vitest";

import { MAX_ATTACHMENT_BYTES } from "@shared/attachments/attachment-limits";
import {
  DEFAULT_RESTORE_LIMITS,
  type RestoreLimits,
} from "@shared/restore/restore-limits";

import {
  checkArchiveEntries,
  checkArchiveEntryCount,
  classifyArchiveEntryName,
  type ArchiveEntryFacts,
} from "./backup-archive-policy";

/**
 * 构造一个合规的压缩包文件事实.
 * @param name 路径.
 * @param overrides 要覆盖的部分.
 * @returns 文件事实.
 */
function facts(
  name: string,
  overrides: Partial<ArchiveEntryFacts> = {},
): ArchiveEntryFacts {
  return {
    name,
    uncompressedSize: 10,
    isEncrypted: false,
    compressionMethod: 8,
    ...overrides,
  };
}

/**
 * 合规的压缩包: 清单, 保险库数据与一个附件.
 */
const VALID_ENTRIES: readonly ArchiveEntryFacts[] = [
  facts("manifest.json"),
  facts("vault.json"),
  facts("attachments/att-1", { compressionMethod: 0 }),
];

/**
 * 不被认识的路径: 路径穿越, 绝对路径, 反斜杠, 嵌套, 目录与大小写不符.
 */
const UNKNOWN_NAMES = [
  "../manifest.json",
  "/manifest.json",
  "C:/x",
  "a/../vault.json",
  "attachments\\att-1",
  "attachments/",
  "attachments/a/b",
  "attachments/../evil",
  "attachments/a.b",
  "Manifest.json",
  "readme.txt",
  "",
];

/**
 * 很小的各项上限, 用来造超限.
 */
const SMALL_LIMITS: RestoreLimits = {
  ...DEFAULT_RESTORE_LIMITS,
  maxManifestBytes: 100,
  maxVaultDocumentBytes: 200,
  maxUncompressedBytes: 400,
};

describe("按路径判断压缩包里的文件角色", () => {
  it("认清单, 保险库数据与附件", () => {
    expect(classifyArchiveEntryName("manifest.json")).toEqual({
      kind: "manifest",
    });
    expect(classifyArchiveEntryName("vault.json")).toEqual({ kind: "vault" });
    expect(classifyArchiveEntryName("attachments/att-1")).toEqual({
      kind: "attachment",
      attachmentId: "att-1",
    });
  });

  it("路径穿越, 绝对路径, 反斜杠, 嵌套, 目录与大小写不符的路径都不认", () => {
    for (const name of UNKNOWN_NAMES) {
      expect(classifyArchiveEntryName(name)).toBeUndefined();
    }
  });
});

describe("压缩包文件个数上限", () => {
  it("超过上限时拒绝, 等于上限时通过", () => {
    const limits = { ...DEFAULT_RESTORE_LIMITS, maxArchiveFiles: 5 };

    expect(checkArchiveEntryCount(5, limits)).toBeUndefined();
    expect(checkArchiveEntryCount(6, limits)).toEqual({
      ok: false,
      reason: "limit-exceeded",
      problem: { section: "archive", code: "too-many-files" },
    });
  });
});

describe("整体检查压缩包里的文件: 名称", () => {
  it("合规的压缩包通过", () => {
    expect(
      checkArchiveEntries(VALID_ENTRIES, DEFAULT_RESTORE_LIMITS),
    ).toBeUndefined();
  });

  it("没有清单就不是本应用的备份文件, 缺保险库数据文件时整体拒绝", () => {
    const noManifest = [facts("vault.json"), facts("readme.txt")];

    expect(checkArchiveEntries(noManifest, DEFAULT_RESTORE_LIMITS)).toEqual({
      ok: false,
      reason: "not-a-backup",
    });
    expect(
      checkArchiveEntries([facts("manifest.json")], DEFAULT_RESTORE_LIMITS),
    ).toMatchObject({ problem: { code: "missing-file" } });
  });

  it("有不认识的路径或重复的路径时指出是第几个文件", () => {
    const unknown = [...VALID_ENTRIES, facts("../evil")];
    const duplicate = [...VALID_ENTRIES, facts("attachments/att-1")];

    expect(checkArchiveEntries(unknown, DEFAULT_RESTORE_LIMITS)).toMatchObject({
      problem: { section: "archive", code: "unexpected-file", position: 4 },
    });
    expect(
      checkArchiveEntries(duplicate, DEFAULT_RESTORE_LIMITS),
    ).toMatchObject({
      problem: { section: "archive", code: "duplicate-file", position: 4 },
    });
  });
});

describe("整体检查压缩包里的文件: 存放方式与大小", () => {
  it("文件加密或压缩方法不支持时判为损坏", () => {
    for (const bad of [
      facts("vault.json", { isEncrypted: true }),
      facts("vault.json", { compressionMethod: 14 }),
    ]) {
      const entries = [facts("manifest.json"), bad];

      expect(checkArchiveEntries(entries, DEFAULT_RESTORE_LIMITS)).toEqual({
        ok: false,
        reason: "damaged-file",
      });
    }
  });

  it("清单与保险库数据声明的字节数超限时整体拒绝", () => {
    const bigManifest = [
      facts("manifest.json", { uncompressedSize: 101 }),
      facts("vault.json"),
    ];
    const bigVault = [
      facts("manifest.json"),
      facts("vault.json", { uncompressedSize: 201 }),
    ];

    expect(checkArchiveEntries(bigManifest, SMALL_LIMITS)).toMatchObject({
      reason: "limit-exceeded",
      problem: { code: "too-large", position: 1 },
    });
    expect(checkArchiveEntries(bigVault, SMALL_LIMITS)).toMatchObject({
      problem: { position: 2 },
    });
  });
});

describe("整体检查压缩包里的文件: 附件与总量", () => {
  it("单个附件超过上限, 或全部加起来超过总量上限时整体拒绝", () => {
    const bigAttachment = [
      facts("manifest.json"),
      facts("vault.json"),
      facts("attachments/a", { uncompressedSize: MAX_ATTACHMENT_BYTES + 1 }),
    ];
    const overTotal = [
      facts("manifest.json", { uncompressedSize: 100 }),
      facts("vault.json", { uncompressedSize: 200 }),
      facts("attachments/a", { uncompressedSize: 101 }),
    ];
    const roomy = {
      ...SMALL_LIMITS,
      maxUncompressedBytes: Number.MAX_SAFE_INTEGER,
    };

    expect(checkArchiveEntries(bigAttachment, roomy)).toMatchObject({
      problem: { position: 3 },
    });
    expect(checkArchiveEntries(overTotal, SMALL_LIMITS)).toMatchObject({
      problem: { code: "too-large", position: 3 },
    });
  });
});
