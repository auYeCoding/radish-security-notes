import { describe, expect, it } from "vitest";

import {
  loadSampleBackup,
  syncManifestCounts,
  toRawArchive,
  type SampleBackup,
} from "../testing/restore-sample-backup";
import { useVaultDatabase } from "../testing/use-vault-database";
import { validateBackup } from "./restore-backup-validator";

/**
 * 校验一个备份样本.
 * @param backup 备份样本.
 * @returns 校验结果.
 */
function validate(backup: SampleBackup): ReturnType<typeof validateBackup> {
  return validateBackup(toRawArchive(backup));
}

/**
 * 把备份样本清空成没有任何内容的备份.
 * @param backup 备份样本.
 */
function emptyOut(backup: SampleBackup): void {
  backup.vault.folders = [];
  backup.vault.tags = [];
  backup.vault.customEntryTypes = [];
  backup.vault.entries = [];
  backup.attachments.clear();
  syncManifestCounts(backup);
}

describe("备份整体校验: 通过的备份", () => {
  const getDatabase = useVaultDatabase("restore-backup-validator-ok");

  it("真实导出的备份通过, 附件字节数与个数照实统计", async () => {
    const backup = await loadSampleBackup(getDatabase().orm);
    const bytes = [...backup.attachments.values()].map((item) => item.length);

    const result = validate(backup);

    expect(result.ok && result.value.document.entries).toHaveLength(8);
    expect(result.ok && result.value.attachments.size).toBe(3);
    expect(result.ok && result.value.attachmentBytes).toBe(
      bytes.reduce((total, size) => total + size, 0),
    );
  });

  it("没有任何内容的空备份也能通过, 清单计数为 0", async () => {
    const backup = await loadSampleBackup(getDatabase().orm);
    emptyOut(backup);

    expect(validate(backup).ok).toBe(true);
  });
});

describe("备份整体校验: 发现问题的顺序", () => {
  const getDatabase = useVaultDatabase("restore-backup-validator-order");

  it("文件夹先于条目, 条目先于附件, 清单计数最先", async () => {
    const backup = await loadSampleBackup(getDatabase().orm);
    backup.vault.folders[0].name = " 工作";
    backup.vault.entries[0].type = "nope";
    backup.vault.entries[0].attachments[0].size = 0;

    expect(validate(backup)).toMatchObject({ problem: { section: "folders" } });
    backup.vault.folders[0].name = "工作";
    expect(validate(backup)).toMatchObject({ problem: { section: "entries" } });
    backup.vault.entries[0].type = "login";
    expect(validate(backup)).toMatchObject({
      problem: { section: "attachments" },
    });
    backup.manifest.counts.entries += 1;
    expect(validate(backup)).toMatchObject({
      problem: { section: "manifest" },
    });
  });

  it("失败结果只带区段, 种类与序号, 不含备份里的任何内容", async () => {
    const backup = await loadSampleBackup(getDatabase().orm);
    backup.vault.entries[0].name = "";

    expect(JSON.stringify(validate(backup))).toBe(
      JSON.stringify({
        ok: false,
        reason: "invalid-content",
        problem: { section: "entries", code: "invalid-value", position: 1 },
      }),
    );
  });
});
