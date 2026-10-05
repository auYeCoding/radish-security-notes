import { describe, expect, it } from "vitest";

import { createEmailBackupFixture } from "../testing/email-backup-fixture";
import {
  PLAINTEXT_SETTINGS,
  RUN_WITH_ATTACHMENTS,
  leftoverFiles,
  saveSettings,
  seedLargeNotes,
} from "../testing/email-backup-test-helpers";
import { seedBulkEntries } from "../testing/export-bulk-data";
import { useTemporaryDirectory } from "../testing/temporary-directory";
import { useVaultDatabase } from "../testing/use-vault-database";

/**
 * 1 MB 的字节数, 测试里的单封上限.
 */
const ONE_MEBIBYTE = 1024 * 1024;

describe("立即备份: 估计超出邮箱上限", () => {
  const getDatabase = useVaultDatabase("email-oversize-limit");
  const getDirectory = useTemporaryDirectory("email-oversize-limit-dir");

  it("不发送, 给出大小与上限, 删临时文件, 上次结果记 too-large", async () => {
    const { orm } = getDatabase();
    seedBulkEntries(orm, {
      count: 3,
      attachmentEvery: 1,
      attachmentBytes: 700_000,
    });
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture, {
      ...PLAINTEXT_SETTINGS,
      sizeLimitMebibytes: 1,
    });
    const oversize = await fixture.service.runBackup(RUN_WITH_ATTACHMENTS);
    expect(oversize).toMatchObject({
      ok: true,
      value: {
        status: "too-large",
        limitBytes: ONE_MEBIBYTE,
        canDropAttachments: true,
      },
    });
    expect(
      oversize.ok && oversize.value.status === "too-large"
        ? oversize.value.estimatedSizeBytes
        : 0,
    ).toBeGreaterThan(ONE_MEBIBYTE);
    expect(fixture.sent).toHaveLength(0);
    expect(await leftoverFiles(fixture)).toEqual([]);
    expect(fixture.service.getLastResult()).toMatchObject({
      ok: true,
      value: { outcome: "failure", reason: "too-large" },
    });
  });
});

describe("立即备份: 去掉附件后再发", () => {
  const getDatabase = useVaultDatabase("email-oversize-drop");
  const getDirectory = useTemporaryDirectory("email-oversize-drop-dir");

  it("去掉附件的备份在上限内, 发送成功, 上次结果改记成功", async () => {
    const { orm } = getDatabase();
    seedBulkEntries(orm, {
      count: 3,
      attachmentEvery: 1,
      attachmentBytes: 700_000,
    });
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture, {
      ...PLAINTEXT_SETTINGS,
      sizeLimitMebibytes: 1,
    });
    await fixture.service.runBackup(RUN_WITH_ATTACHMENTS);
    const retried = await fixture.service.runBackup({
      withoutAttachments: true,
    });
    expect(retried).toMatchObject({
      ok: true,
      value: {
        status: "sent",
        summary: { includesAttachments: false, attachmentCount: 0 },
      },
    });
    expect(fixture.sent).toHaveLength(1);
    expect(fixture.service.getLastResult()).toMatchObject({
      ok: true,
      value: { outcome: "success" },
    });
  });
});

describe("立即备份: 去掉附件后仍超出上限", () => {
  const getDatabase = useVaultDatabase("email-oversize-still");
  const getDirectory = useTemporaryDirectory("email-oversize-still-dir");

  it("不再提供去掉附件, 不发送", async () => {
    const { orm } = getDatabase();
    seedLargeNotes(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture, {
      ...PLAINTEXT_SETTINGS,
      sizeLimitMebibytes: 1,
    });
    const result = await fixture.service.runBackup({
      withoutAttachments: true,
    });
    expect(result).toMatchObject({
      ok: true,
      value: { status: "too-large", canDropAttachments: false },
    });
    expect(fixture.sent).toHaveLength(0);
  });
});
