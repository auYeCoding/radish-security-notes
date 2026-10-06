import { describe, expect, it } from "vitest";

import { AUTO_BACKUP_INTERVAL_MILLISECONDS } from "@shared/email-backup/auto-backup-interval";

import { AUTO_BACKUP_RETRY_WAIT_MILLISECONDS } from "./auto-backup-backoff";
import {
  createEmailBackupFixture,
  SAMPLE_AUTHORIZATION_CODE,
  SAMPLE_PASSPHRASE,
  SAMPLE_SENDER_ADDRESS,
  type EmailBackupFixture,
} from "../testing/email-backup-fixture";
import {
  PLAINTEXT_SETTINGS,
  RUN_WITH_ATTACHMENTS,
  enableAutoBackup,
  readAutoBackupStatus,
  saveSettings,
} from "../testing/email-backup-test-helpers";
import { seedBulkEntries } from "../testing/export-bulk-data";
import { seedExportSample } from "../testing/export-sample-data";
import { useTemporaryDirectory } from "../testing/temporary-directory";
import { useVaultDatabase } from "../testing/use-vault-database";

/**
 * 一天的毫秒数.
 */
const DAY = AUTO_BACKUP_INTERVAL_MILLISECONDS.daily;

/**
 * 失败后的退避等待, 一小时.
 */
const HOUR = AUTO_BACKUP_RETRY_WAIT_MILLISECONDS;

/**
 * 把假系统时钟往后拨.
 * @param fixture 测试环境.
 * @param milliseconds 要拨的毫秒数.
 */
function advance(fixture: EmailBackupFixture, milliseconds: number): void {
  fixture.state.now = new Date(fixture.state.now.getTime() + milliseconds);
}

/**
 * 让之后的发送按给定的错误码失败.
 * @param fixture 测试环境.
 * @param code nodemailer 的错误码.
 */
function failSendingWith(fixture: EmailBackupFixture, code: string): void {
  fixture.state.sendError = Object.assign(new Error("rejected"), { code });
}

describe("自动备份失败: 认证失败暂停, 重新保存授权码后恢复", () => {
  const getDatabase = useVaultDatabase("auto-failure-auth");
  const getDirectory = useTemporaryDirectory("auto-failure-auth-dir");

  it("认证失败后暂停且不再尝试, 重新保存授权码后自动恢复, 成功后清掉失败记录", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture, PLAINTEXT_SETTINGS);
    await enableAutoBackup(fixture);
    failSendingWith(fixture, "EAUTH");
    const failed = await fixture.service.runScheduled("scheduled");
    expect(failed).toEqual({ ok: false, reason: "authentication-failed" });
    expect(readAutoBackupStatus(fixture)).toMatchObject({
      phase: "paused",
      lastFailureReason: "authentication-failed",
      lastFailureAt: fixture.state.now.getTime(),
    });
    advance(fixture, 2 * DAY);
    await fixture.service.runScheduled("scheduled");
    expect(fixture.sent).toHaveLength(1);
    fixture.state.sendError = undefined;
    await saveSettings(fixture, {
      ...PLAINTEXT_SETTINGS,
      authorizationCode: "a-new-authorization-code",
    });
    expect(readAutoBackupStatus(fixture).phase).toBe("due");
    await fixture.service.runScheduled("scheduled");
    expect(fixture.sent).toHaveLength(2);
    expect(readAutoBackupStatus(fixture).lastFailureReason).toBeUndefined();
  });

  it("关闭后重新开启, 暂停与失败记录都清掉", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture, PLAINTEXT_SETTINGS);
    await enableAutoBackup(fixture);
    failSendingWith(fixture, "EAUTH");
    await fixture.service.runScheduled("scheduled");
    await fixture.service.saveAutoBackup({
      isEnabled: false,
      interval: "daily",
    });
    await enableAutoBackup(fixture);
    const status = readAutoBackupStatus(fixture);
    expect(status.phase).toBe("due");
    expect(status.lastFailureReason).toBeUndefined();
  });
});

describe("自动备份失败: 退避与次数上限", () => {
  const getDatabase = useVaultDatabase("auto-failure-backoff");
  const getDirectory = useTemporaryDirectory("auto-failure-backoff-dir");

  it("失败后等一小时再试, 同一个间隔内失败 3 次后不再尝试, 下一个间隔重新开始", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture, PLAINTEXT_SETTINGS);
    await enableAutoBackup(fixture);
    failSendingWith(fixture, "ECONNECTION");
    const firstFailureAt = fixture.state.now.getTime();
    await fixture.service.runScheduled("scheduled");
    expect(readAutoBackupStatus(fixture)).toMatchObject({
      phase: "backing-off",
      nextRunAt: firstFailureAt + HOUR,
    });
    advance(fixture, HOUR - 1);
    await fixture.service.runScheduled("scheduled");
    expect(fixture.sent).toHaveLength(1);
    advance(fixture, 1);
    await fixture.service.runScheduled("scheduled");
    advance(fixture, HOUR);
    await fixture.service.runScheduled("scheduled");
    expect(fixture.sent).toHaveLength(3);
    expect(readAutoBackupStatus(fixture)).toMatchObject({
      phase: "exhausted",
      nextRunAt: firstFailureAt + DAY,
    });
    fixture.state.now = new Date(firstFailureAt + DAY - 1);
    await fixture.service.runScheduled("scheduled");
    expect(fixture.sent).toHaveLength(3);
    fixture.state.now = new Date(firstFailureAt + DAY);
    await fixture.service.runScheduled("scheduled");
    expect(fixture.sent).toHaveLength(4);
  });
});

describe("自动备份失败: 超限不重试也不去附件", () => {
  const getDatabase = useVaultDatabase("auto-failure-oversize");
  const getDirectory = useTemporaryDirectory("auto-failure-oversize-dir");

  it("记 too-large, 不发送, 本间隔不再尝试, 提示留给用户手动处理", async () => {
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
    await enableAutoBackup(fixture);
    const oversize = await fixture.service.runScheduled("scheduled");
    expect(oversize).toMatchObject({
      ok: true,
      value: { status: "too-large", canDropAttachments: true },
    });
    expect(readAutoBackupStatus(fixture)).toMatchObject({
      phase: "exhausted",
      lastFailureReason: "too-large",
    });
    advance(fixture, 2 * HOUR);
    await fixture.service.runScheduled("scheduled");
    expect(fixture.sent).toHaveLength(0);
    expect(fixture.service.getLastResult()).toMatchObject({
      value: {
        outcome: "failure",
        reason: "too-large",
        triggerKind: "scheduled",
      },
    });
  });
});

describe("自动备份失败: 与手动备份的关系", () => {
  const getDatabase = useVaultDatabase("auto-failure-manual");
  const getDirectory = useTemporaryDirectory("auto-failure-manual-dir");

  it("手动备份失败不改自动备份的计划, 之后任何成功都清掉自动备份的失败记录", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture, PLAINTEXT_SETTINGS);
    await enableAutoBackup(fixture);
    failSendingWith(fixture, "ECONNECTION");
    await fixture.service.runBackup(RUN_WITH_ATTACHMENTS);
    expect(readAutoBackupStatus(fixture)).toMatchObject({ phase: "due" });
    expect(readAutoBackupStatus(fixture).lastFailureReason).toBeUndefined();
    await fixture.service.runScheduled("scheduled");
    expect(readAutoBackupStatus(fixture).lastFailureReason).toBe(
      "connection-failed",
    );
    fixture.state.sendError = undefined;
    await fixture.service.runBackup(RUN_WITH_ATTACHMENTS);
    expect(readAutoBackupStatus(fixture)).toMatchObject({
      phase: "scheduled",
    });
    expect(readAutoBackupStatus(fixture).lastFailureReason).toBeUndefined();
  });
});

describe("自动备份失败: 日志与返回值不含机密", () => {
  const getDatabase = useVaultDatabase("auto-failure-secrets");
  const getDirectory = useTemporaryDirectory("auto-failure-secrets-dir");

  it("失败日志只写带原因码的错误名, 授权码, 口令与邮箱地址不出现", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture);
    await enableAutoBackup(fixture);
    fixture.state.sendError = Object.assign(
      new Error(`rejected ${SAMPLE_AUTHORIZATION_CODE} ${SAMPLE_PASSPHRASE}`),
      { code: "EAUTH" },
    );
    const result = await fixture.service.runScheduled("scheduled");
    expect(fixture.failures.map((error) => String(error))).toEqual([
      "EmailBackupFailureError:authentication-failed: authentication-failed",
    ]);
    const everything = JSON.stringify([
      result,
      fixture.failures,
      readAutoBackupStatus(fixture),
      fixture.service.getLastResult(),
    ]);
    for (const secret of [
      SAMPLE_AUTHORIZATION_CODE,
      SAMPLE_PASSPHRASE,
      SAMPLE_SENDER_ADDRESS,
    ]) {
      expect(everything).not.toContain(secret);
    }
  }, 60000);
});
