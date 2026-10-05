import { describe, expect, it } from "vitest";

import { snapshotDatabase } from "../testing/database-snapshot";
import {
  SAMPLE_ENTRY_IDS,
  SAMPLE_PDF_BYTES,
  seedExportSample,
} from "../testing/export-sample-data";
import { useVaultDatabase } from "../testing/use-vault-database";
import { countExportScope } from "./export-scope-counter";

describe("导出范围统计", () => {
  const getDatabase = useVaultDatabase("export-scope-counter");

  it("空保险库全是 0", () => {
    expect(countExportScope(getDatabase().orm, { kind: "all" })).toEqual({
      entryCount: 0,
      attachmentCount: 0,
      attachmentBytes: 0,
    });
  });

  it("全部范围: 条目数, 附件个数与总字节数", () => {
    seedExportSample(getDatabase().orm);
    expect(countExportScope(getDatabase().orm, { kind: "all" })).toEqual({
      entryCount: 8,
      attachmentCount: 3,
      attachmentBytes: SAMPLE_PDF_BYTES.length + 256 + 3,
    });
  });

  it("指定条目: 只统计这些条目与它们的附件, 不存在与重复的编号不影响结果", () => {
    seedExportSample(getDatabase().orm);
    expect(
      countExportScope(getDatabase().orm, {
        kind: "entries",
        entryIds: [SAMPLE_ENTRY_IDS.login, SAMPLE_ENTRY_IDS.login, "ghost"],
      }),
    ).toEqual({
      entryCount: 1,
      attachmentCount: 2,
      attachmentBytes: SAMPLE_PDF_BYTES.length + 256,
    });
    expect(
      countExportScope(getDatabase().orm, { kind: "entries", entryIds: [] }),
    ).toEqual({ entryCount: 0, attachmentCount: 0, attachmentBytes: 0 });
  });

  it("统计不改动库里任何数据", () => {
    seedExportSample(getDatabase().orm);
    const before = snapshotDatabase(getDatabase().orm);
    countExportScope(getDatabase().orm, { kind: "all" });
    expect(snapshotDatabase(getDatabase().orm)).toBe(before);
  });
});
