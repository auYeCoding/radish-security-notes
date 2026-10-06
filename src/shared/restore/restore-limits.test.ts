import { describe, expect, it } from "vitest";

import { MAX_ATTACHMENTS_PER_ENTRY } from "../attachments/attachment-limits";
import { MAX_TRANSFER_ENTRIES } from "../data-transfer/transfer-limits";
import { DEFAULT_RESTORE_LIMITS } from "./restore-limits";

describe("恢复的读取上限", () => {
  it("备份文件与未压缩总量是 256 MiB, 保险库数据 128 MiB, 清单 64 KiB", () => {
    expect(DEFAULT_RESTORE_LIMITS.maxFileBytes).toBe(256 * 1024 * 1024);
    expect(DEFAULT_RESTORE_LIMITS.maxUncompressedBytes).toBe(256 * 1024 * 1024);
    expect(DEFAULT_RESTORE_LIMITS.maxVaultDocumentBytes).toBe(
      128 * 1024 * 1024,
    );
    expect(DEFAULT_RESTORE_LIMITS.maxManifestBytes).toBe(64 * 1024);
  });

  it("压缩包文件个数是清单与保险库数据, 加每个条目都带满附件时的附件个数", () => {
    expect(DEFAULT_RESTORE_LIMITS.maxArchiveFiles).toBe(
      2 + MAX_TRANSFER_ENTRIES * MAX_ATTACHMENTS_PER_ENTRY,
    );
  });

  it("单项上限不超过总量上限", () => {
    expect(DEFAULT_RESTORE_LIMITS.maxVaultDocumentBytes).toBeLessThanOrEqual(
      DEFAULT_RESTORE_LIMITS.maxUncompressedBytes,
    );
    expect(DEFAULT_RESTORE_LIMITS.maxManifestBytes).toBeLessThan(
      DEFAULT_RESTORE_LIMITS.maxVaultDocumentBytes,
    );
  });
});
