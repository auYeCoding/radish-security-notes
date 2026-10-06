import { describe, expect, it } from "vitest";

import type { RestoreVaultState } from "@shared/restore/restore-types";

import {
  loadSampleBackup,
  toRawArchive,
  type SampleBackup,
} from "../testing/restore-sample-backup";
import { useVaultDatabase } from "../testing/use-vault-database";
import type { ValidatedBackup } from "./restore-backup-types";
import { validateBackup } from "./restore-backup-validator";
import { buildRestorePreview } from "./restore-preview-builder";

/**
 * 空保险库的现状.
 */
const EMPTY_VAULT: RestoreVaultState = {
  isEmpty: true,
  entryCount: 0,
  attachmentCount: 0,
  folderCount: 0,
  tagCount: 0,
  customTypeCount: 0,
};

/**
 * 有内容的保险库的现状.
 */
const FILLED_VAULT: RestoreVaultState = {
  isEmpty: false,
  entryCount: 4,
  attachmentCount: 1,
  folderCount: 2,
  tagCount: 3,
  customTypeCount: 0,
};

/**
 * 校验备份样本, 得到校验后的备份.
 * @param backup 备份样本.
 * @returns 校验后的备份.
 * @throws Error 当样本没有通过校验时.
 */
function validated(backup: SampleBackup): ValidatedBackup {
  const result = validateBackup(toRawArchive(backup));
  if (!result.ok) {
    throw new Error("样本应当通过校验");
  }
  return result.value;
}

/**
 * 把备份样本改成不含保密字段与附件的备份.
 * @param backup 备份样本.
 */
function stripSecretsAndAttachments(backup: SampleBackup): void {
  backup.manifest.includesSecrets = false;
  backup.manifest.includesAttachments = false;
  backup.manifest.counts.attachments = 0;
  for (const entry of backup.vault.entries) {
    entry.attachments = [];
  }
  backup.attachments.clear();
}

describe("预览概要: 完整的备份", () => {
  const getDatabase = useVaultDatabase("restore-preview-builder-full");

  it("由校验后的备份与现状生成只含计数与标志的概要", async () => {
    const sample = await loadSampleBackup(getDatabase().orm);
    const backup = validated(sample);
    const context = {
      isEncrypted: true,
      vault: FILLED_VAULT,
      requiresMasterPassword: true,
    };

    expect(buildRestorePreview(backup, context)).toEqual({
      createdAt: sample.manifest.createdAt,
      isEncrypted: true,
      entryCount: 8,
      folderCount: 3,
      tagCount: 3,
      customTypeCount: 2,
      attachmentCount: 3,
      attachmentBytes: backup.attachmentBytes,
      includesSecrets: true,
      includesAttachments: true,
      vault: FILLED_VAULT,
      requiresMasterPassword: true,
    });
  });
});

describe("预览概要: 不含保密字段与附件的备份", () => {
  const getDatabase = useVaultDatabase("restore-preview-builder-bare");

  it("如实反映在标志里", async () => {
    const sample = await loadSampleBackup(getDatabase().orm);
    stripSecretsAndAttachments(sample);
    const context = {
      isEncrypted: false,
      vault: EMPTY_VAULT,
      requiresMasterPassword: false,
    };

    expect(buildRestorePreview(validated(sample), context)).toMatchObject({
      includesSecrets: false,
      includesAttachments: false,
      attachmentCount: 0,
      attachmentBytes: 0,
    });
  });
});
