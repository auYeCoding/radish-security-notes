import { describe, expect, it } from "vitest";

import { AUTO_BACKUP_INTERVAL_MILLISECONDS } from "@shared/email-backup/auto-backup-interval";

import {
  createEmailBackupFixture,
  SAMPLE_MASTER_PASSWORD,
  type EmailBackupFixture,
} from "../testing/email-backup-fixture";
import {
  PLAINTEXT_SETTINGS,
  RUN_WITH_ATTACHMENTS,
  enableAutoBackup,
  saveSettings,
} from "../testing/email-backup-test-helpers";
import { seedExportSample } from "../testing/export-sample-data";
import { useTemporaryDirectory } from "../testing/temporary-directory";
import { useVaultDatabase } from "../testing/use-vault-database";
import { readZipEntries } from "../testing/zip-test-reader";

/**
 * 一天的毫秒数.
 */
const DAY = AUTO_BACKUP_INTERVAL_MILLISECONDS.daily;

/**
 * 把一封已发出邮件的附件按文件名整理成名字到内容的对照, 用来比较两份备份.
 * @param fixture 测试环境.
 * @param index 第几封邮件.
 * @returns 备份里每个文件名对应的内容文本.
 */
function attachmentContents(
  fixture: EmailBackupFixture,
  index: number,
): Record<string, string> {
  const bytes = fixture.sent[index]?.attachmentBytes ?? Buffer.alloc(0);
  return Object.fromEntries(
    readZipEntries(bytes).map((entry) => [
      entry.name,
      entry.content.toString("base64"),
    ]),
  );
}

describe("自动备份: 到点发送", () => {
  const getDatabase = useVaultDatabase("auto-run-send");
  const getDirectory = useTemporaryDirectory("auto-run-send-dir");

  it("没有成功记录时发出, 内容与手动备份逐项相同, 上次结果记触发方式", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture, PLAINTEXT_SETTINGS);
    await enableAutoBackup(fixture);
    const scheduled = await fixture.service.runScheduled("scheduled");
    expect(scheduled).toMatchObject({ ok: true, value: { status: "sent" } });
    expect(fixture.service.getLastResult()).toMatchObject({
      ok: true,
      value: { outcome: "success", triggerKind: "scheduled" },
    });
    await fixture.service.runBackup(RUN_WITH_ATTACHMENTS);
    expect(fixture.sent).toHaveLength(2);
    expect(attachmentContents(fixture, 0)).toEqual(
      attachmentContents(fixture, 1),
    );
    expect(fixture.service.getLastResult()).toMatchObject({
      value: { triggerKind: "manual" },
    });
  });

  it("启动补发的触发方式记为 catch-up", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture, PLAINTEXT_SETTINGS);
    await enableAutoBackup(fixture);
    await fixture.service.runScheduled("catch-up");
    expect(fixture.service.getLastResult()).toMatchObject({
      value: { outcome: "success", triggerKind: "catch-up" },
    });
  });

  it("设了主密码也无人值守, 不要求再输主密码", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    fixture.state.hasMasterPassword = true;
    await saveSettings(fixture, {
      ...PLAINTEXT_SETTINGS,
      masterPassword: SAMPLE_MASTER_PASSWORD,
    });
    await enableAutoBackup(fixture, { masterPassword: SAMPLE_MASTER_PASSWORD });
    const scheduled = await fixture.service.runScheduled("scheduled");
    expect(scheduled).toMatchObject({ ok: true, value: { status: "sent" } });
    expect(fixture.sent).toHaveLength(1);
  });
});

describe("自动备份: 不到点不发", () => {
  const getDatabase = useVaultDatabase("auto-run-not-due");
  const getDirectory = useTemporaryDirectory("auto-run-not-due-dir");

  it("关闭时什么也不做", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture, PLAINTEXT_SETTINGS);
    expect(await fixture.service.runScheduled("scheduled")).toEqual({
      ok: true,
      value: undefined,
    });
    expect(fixture.sent).toHaveLength(0);
  });

  it("距上次成功不满一个间隔不发, 满了再发", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture, PLAINTEXT_SETTINGS);
    await enableAutoBackup(fixture);
    await fixture.service.runScheduled("scheduled");
    fixture.state.now = new Date(fixture.state.now.getTime() + DAY - 1);
    expect(await fixture.service.runScheduled("scheduled")).toEqual({
      ok: true,
      value: undefined,
    });
    expect(fixture.sent).toHaveLength(1);
    fixture.state.now = new Date(fixture.state.now.getTime() + 1);
    await fixture.service.runScheduled("scheduled");
    expect(fixture.sent).toHaveLength(2);
  });

  it("手动备份刚成功过, 自动备份不重复发送", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture, PLAINTEXT_SETTINGS);
    await enableAutoBackup(fixture);
    await fixture.service.runBackup(RUN_WITH_ATTACHMENTS);
    await fixture.service.runScheduled("catch-up");
    expect(fixture.sent).toHaveLength(1);
  });
});

describe("自动备份: 单飞与未解锁", () => {
  const getDatabase = useVaultDatabase("auto-run-single-flight");
  const getDirectory = useTemporaryDirectory("auto-run-single-flight-dir");

  it("手动备份进行中自动检查返回 busy, 自动备份进行中手动备份也返回 busy", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture, PLAINTEXT_SETTINGS);
    await enableAutoBackup(fixture);
    const manual = fixture.service.runBackup(RUN_WITH_ATTACHMENTS);
    expect(await fixture.service.runScheduled("scheduled")).toEqual({
      ok: false,
      reason: "busy",
    });
    await manual;
    fixture.state.now = new Date(fixture.state.now.getTime() + DAY);
    const scheduled = fixture.service.runScheduled("scheduled");
    expect(await fixture.service.runBackup(RUN_WITH_ATTACHMENTS)).toEqual({
      ok: false,
      reason: "busy",
    });
    expect(await scheduled).toMatchObject({ ok: true });
    expect(fixture.sent).toHaveLength(2);
  });

  it("未解锁时自动检查什么也不做", async () => {
    const fixture = createEmailBackupFixture(() => undefined, getDirectory());
    expect(await fixture.service.runScheduled("catch-up")).toEqual({
      ok: true,
      value: undefined,
    });
    expect(fixture.sent).toHaveLength(0);
  });
});
