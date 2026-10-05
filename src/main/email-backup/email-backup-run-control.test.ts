import { describe, expect, it } from "vitest";

import {
  createEmailBackupFixture,
  SAMPLE_MASTER_PASSWORD,
  savedSettingsInput,
} from "../testing/email-backup-fixture";
import {
  PLAINTEXT_SETTINGS,
  RUN_WITH_ATTACHMENTS,
  saveSettings,
} from "../testing/email-backup-test-helpers";
import { seedExportSample } from "../testing/export-sample-data";
import { useTemporaryDirectory } from "../testing/temporary-directory";
import { useVaultDatabase } from "../testing/use-vault-database";

describe("立即备份: 进度与单飞", () => {
  const getDatabase = useVaultDatabase("email-control-progress");
  const getDirectory = useTemporaryDirectory("email-control-progress-dir");

  it("发送进行中进度是 sending, 结束后回到空闲", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture, PLAINTEXT_SETTINGS);
    const stages: string[] = [];
    fixture.state.onSend = () => {
      stages.push(fixture.service.getProgress().stage);
    };
    await fixture.service.runBackup(RUN_WITH_ATTACHMENTS);
    expect(stages).toEqual(["sending"]);
    expect(fixture.service.getProgress().stage).toBe("idle");
  });

  it("同一时间只处理一次发送, 第二次返回 busy", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture, PLAINTEXT_SETTINGS);
    const first = fixture.service.runBackup(RUN_WITH_ATTACHMENTS);
    const second = await fixture.service.runBackup(RUN_WITH_ATTACHMENTS);
    expect(second).toEqual({ ok: false, reason: "busy" });
    expect(await first).toMatchObject({ ok: true });
    expect(await fixture.service.sendTest()).toMatchObject({ ok: true });
  });
});

describe("立即备份: 没有保存设置或没有条目", () => {
  const getDatabase = useVaultDatabase("email-control-missing");
  const getDirectory = useTemporaryDirectory("email-control-missing-dir");

  it("没保存过设置返回 not-configured, 不发送, 不记上次结果", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    expect(await fixture.service.runBackup(RUN_WITH_ATTACHMENTS)).toEqual({
      ok: false,
      reason: "not-configured",
    });
    expect(fixture.sent).toHaveLength(0);
    expect(fixture.service.getLastResult()).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it("保险库里没有条目返回 no-entries, 不发送, 不记上次结果", async () => {
    const fixture = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    await saveSettings(fixture, PLAINTEXT_SETTINGS);
    expect(await fixture.service.runBackup(RUN_WITH_ATTACHMENTS)).toEqual({
      ok: false,
      reason: "no-entries",
    });
    expect(fixture.sent).toHaveLength(0);
    expect(fixture.service.getLastResult()).toEqual({
      ok: true,
      value: undefined,
    });
  });
});

describe("立即备份: 主密码复核", () => {
  const getDatabase = useVaultDatabase("email-control-master");
  const getDirectory = useTemporaryDirectory("email-control-master-dir");

  it("设了主密码时立即备份要重输, 没给或不对都拒绝且不发送", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    fixture.state.hasMasterPassword = true;
    await saveSettings(fixture, {
      ...PLAINTEXT_SETTINGS,
      masterPassword: SAMPLE_MASTER_PASSWORD,
    });
    const missing = await fixture.service.runBackup(RUN_WITH_ATTACHMENTS);
    const wrong = await fixture.service.runBackup({
      withoutAttachments: false,
      masterPassword: "wrong",
    });
    const correct = await fixture.service.runBackup({
      withoutAttachments: false,
      masterPassword: SAMPLE_MASTER_PASSWORD,
    });
    expect(missing).toEqual({ ok: false, reason: "wrong-master-password" });
    expect(wrong).toEqual({ ok: false, reason: "wrong-master-password" });
    expect(correct).toMatchObject({ ok: true, value: { status: "sent" } });
    expect(fixture.sent).toHaveLength(1);
  });
});

describe("立即备份: 未解锁", () => {
  const getDirectory = useTemporaryDirectory("email-control-locked-dir");

  it("全部入口返回 vault-locked, 不发送", async () => {
    const fixture = createEmailBackupFixture(() => undefined, getDirectory());
    const locked = { ok: false, reason: "vault-locked" };
    expect(await fixture.service.getSettings()).toEqual(locked);
    expect(await fixture.service.saveSettings(savedSettingsInput())).toEqual(
      locked,
    );
    expect(await fixture.service.sendTest()).toEqual(locked);
    expect(await fixture.service.runBackup(RUN_WITH_ATTACHMENTS)).toEqual(
      locked,
    );
    expect(fixture.service.getLastResult()).toEqual(locked);
    expect(fixture.sent).toHaveLength(0);
  });
});
