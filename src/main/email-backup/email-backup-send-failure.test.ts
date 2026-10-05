import { describe, expect, it } from "vitest";

import {
  createEmailBackupFixture,
  SAMPLE_AUTHORIZATION_CODE,
} from "../testing/email-backup-fixture";
import {
  PLAINTEXT_SETTINGS,
  RUN_WITH_ATTACHMENTS,
  leftoverFiles,
  saveSettings,
} from "../testing/email-backup-test-helpers";
import { seedExportSample } from "../testing/export-sample-data";
import { useTemporaryDirectory } from "../testing/temporary-directory";
import { useVaultDatabase } from "../testing/use-vault-database";

describe("立即备份: 发送失败", () => {
  const getDatabase = useVaultDatabase("email-failure-run");
  const getDirectory = useTemporaryDirectory("email-failure-run-dir");

  it.each([
    ["认证失败", { code: "EAUTH" }, "authentication-failed"],
    ["连接失败", { code: "ECONNECTION" }, "connection-failed"],
    ["服务器拒收过大", { responseCode: 552 }, "server-rejected-size"],
    ["其它失败", { code: "EENVELOPE", responseCode: 554 }, "send-failed"],
  ])(
    "%s: 返回对应原因, 记上次结果, 删临时文件",
    async (_name, details, reason) => {
      const { orm } = getDatabase();
      seedExportSample(orm);
      const fixture = createEmailBackupFixture(() => orm, getDirectory());
      await saveSettings(fixture, PLAINTEXT_SETTINGS);
      fixture.state.sendError = Object.assign(new Error("rejected"), details);
      const result = await fixture.service.runBackup(RUN_WITH_ATTACHMENTS);
      expect(result).toEqual({ ok: false, reason });
      expect(await leftoverFiles(fixture)).toEqual([]);
      expect(fixture.service.getLastResult()).toMatchObject({
        ok: true,
        value: { outcome: "failure", reason },
      });
    },
  );
});

describe("立即备份: 失败时日志与返回值不含机密", () => {
  const getDatabase = useVaultDatabase("email-failure-log");
  const getDirectory = useTemporaryDirectory("email-failure-log-dir");

  it("日志只写带原因码的错误名, 服务器的响应文本与授权码不出现", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture, PLAINTEXT_SETTINGS);
    fixture.state.sendError = Object.assign(
      new Error(
        `rejected for secret@example.com with ${SAMPLE_AUTHORIZATION_CODE}`,
      ),
      { code: "EAUTH" },
    );
    const result = await fixture.service.runBackup(RUN_WITH_ATTACHMENTS);
    expect(fixture.failures.map((error) => String(error))).toEqual([
      "EmailBackupFailureError:authentication-failed: authentication-failed",
    ]);
    const everything = JSON.stringify([result, fixture.failures]);
    expect(everything).not.toContain(SAMPLE_AUTHORIZATION_CODE);
    expect(everything).not.toContain("secret@example.com");
  });
});

describe("发送测试邮件", () => {
  const getDatabase = useVaultDatabase("email-test-send");
  const getDirectory = useTemporaryDirectory("email-test-send-dir");

  it("发一封没有附件, 不含条目数据的测试邮件, 不记上次备份结果", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture);
    expect(await fixture.service.sendTest()).toEqual({
      ok: true,
      value: undefined,
    });
    const mail = fixture.sent[0]?.mail;
    expect(mail).toMatchObject({
      from: "alice@qq.com",
      to: "alice@qq.com",
      subject: "emailBackup.mail.test.subject",
      text: "emailBackup.mail.test.body",
    });
    expect(mail?.attachment).toBeUndefined();
    expect(fixture.service.getLastResult()).toEqual({
      ok: true,
      value: undefined,
    });
  });
});

describe("发送测试邮件: 失败", () => {
  const getDatabase = useVaultDatabase("email-test-failure");
  const getDirectory = useTemporaryDirectory("email-test-failure-dir");

  it("没保存过设置返回 not-configured", async () => {
    const fixture = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    expect(await fixture.service.sendTest()).toEqual({
      ok: false,
      reason: "not-configured",
    });
  });

  it("认证失败返回 authentication-failed", async () => {
    const fixture = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    await saveSettings(fixture);
    fixture.state.sendError = Object.assign(new Error("535"), {
      code: "EAUTH",
    });
    expect(await fixture.service.sendTest()).toEqual({
      ok: false,
      reason: "authentication-failed",
    });
  });
});
