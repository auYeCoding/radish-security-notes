import { describe, expect, it } from "vitest";

import { AUTO_BACKUP_INTERVAL_MILLISECONDS } from "@shared/email-backup/auto-backup-interval";

import {
  createEmailBackupFixture,
  SAMPLE_MASTER_PASSWORD,
} from "../testing/email-backup-fixture";
import {
  PLAINTEXT_SETTINGS,
  RUN_WITH_ATTACHMENTS,
  enableAutoBackup,
  readAutoBackupStatus,
  saveSettings,
} from "../testing/email-backup-test-helpers";
import { seedExportSample } from "../testing/export-sample-data";
import { useTemporaryDirectory } from "../testing/temporary-directory";
import { useVaultDatabase } from "../testing/use-vault-database";

describe("自动备份设置: 开启条件", () => {
  const getDatabase = useVaultDatabase("auto-settings-conditions");
  const getDirectory = useTemporaryDirectory("auto-settings-conditions-dir");

  it("默认关闭, 每天一次, 没保存邮箱设置时说明还不能开启", () => {
    const fixture = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    expect(readAutoBackupStatus(fixture)).toEqual({
      isEnabled: false,
      interval: "daily",
      phase: "off",
      blocker: "not-configured",
    });
  });
});

describe("自动备份设置: 开启与关闭", () => {
  const getDatabase = useVaultDatabase("auto-settings-toggle");
  const getDirectory = useTemporaryDirectory("auto-settings-toggle-dir");

  it("邮箱设置不全时开不了, 状态保持关闭", async () => {
    const fixture = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    expect(
      await fixture.service.saveAutoBackup({
        isEnabled: true,
        interval: "daily",
      }),
    ).toEqual({ ok: false, reason: "not-configured" });
    expect(readAutoBackupStatus(fixture).isEnabled).toBe(false);
  });

  it("邮箱设置保存后可以开启, 没有成功记录时阶段是 due, 可以改间隔与关闭", async () => {
    const fixture = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    await saveSettings(fixture, PLAINTEXT_SETTINGS);
    expect(readAutoBackupStatus(fixture).blocker).toBeUndefined();
    await enableAutoBackup(fixture, { interval: "weekly" });
    expect(readAutoBackupStatus(fixture)).toEqual({
      isEnabled: true,
      interval: "weekly",
      phase: "due",
    });
    await fixture.service.saveAutoBackup({
      isEnabled: false,
      interval: "daily",
    });
    expect(readAutoBackupStatus(fixture)).toMatchObject({
      isEnabled: false,
      interval: "daily",
      phase: "off",
    });
  });
});

describe("自动备份设置: 下次计划时间与主密码", () => {
  const getDatabase = useVaultDatabase("auto-settings-master");
  const getDirectory = useTemporaryDirectory("auto-settings-master-dir");

  it("手动备份成功也算上次成功, 下次计划时间是成功时刻加一个间隔", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture, PLAINTEXT_SETTINGS);
    await enableAutoBackup(fixture);
    await fixture.service.runBackup(RUN_WITH_ATTACHMENTS);
    expect(readAutoBackupStatus(fixture)).toEqual({
      isEnabled: true,
      interval: "daily",
      phase: "scheduled",
      nextRunAt:
        fixture.state.now.getTime() + AUTO_BACKUP_INTERVAL_MILLISECONDS.daily,
    });
  });

  it("设了主密码时开启与开着改间隔要重输, 关闭不要", async () => {
    const { orm } = getDatabase();
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    fixture.state.hasMasterPassword = true;
    await saveSettings(fixture, {
      ...PLAINTEXT_SETTINGS,
      masterPassword: SAMPLE_MASTER_PASSWORD,
    });
    const wrong = { ok: false, reason: "wrong-master-password" };
    const request = { isEnabled: true, interval: "daily" } as const;
    expect(await fixture.service.saveAutoBackup(request)).toEqual(wrong);
    expect(
      await fixture.service.saveAutoBackup({ ...request, masterPassword: "x" }),
    ).toEqual(wrong);
    await enableAutoBackup(fixture, { masterPassword: SAMPLE_MASTER_PASSWORD });
    expect(
      await fixture.service.saveAutoBackup({ ...request, interval: "weekly" }),
    ).toEqual(wrong);
    expect(readAutoBackupStatus(fixture).interval).toBe("daily");
    const disabled = await fixture.service.saveAutoBackup({
      isEnabled: false,
      interval: "daily",
    });
    expect(disabled).toMatchObject({ ok: true, value: { isEnabled: false } });
  });
});

describe("自动备份设置: 未解锁", () => {
  const getDirectory = useTemporaryDirectory("auto-settings-locked-dir");

  it("读取与保存都返回 vault-locked", async () => {
    const fixture = createEmailBackupFixture(() => undefined, getDirectory());
    const locked = { ok: false, reason: "vault-locked" };
    expect(fixture.service.getAutoBackup()).toEqual(locked);
    expect(
      await fixture.service.saveAutoBackup({
        isEnabled: false,
        interval: "daily",
      }),
    ).toEqual(locked);
  });
});
