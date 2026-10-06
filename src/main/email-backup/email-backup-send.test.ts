import { Decrypter } from "age-encryption";
import { describe, expect, it } from "vitest";

import {
  createEmailBackupFixture,
  SAMPLE_AUTHORIZATION_CODE,
  SAMPLE_PASSPHRASE,
} from "../testing/email-backup-fixture";
import {
  PLAINTEXT_SETTINGS,
  RUN_WITH_ATTACHMENTS,
  leftoverFiles,
  saveSettings,
} from "../testing/email-backup-test-helpers";
import {
  SAMPLE_LOGIN_PASSWORD,
  SAMPLE_TOTP_SECRET,
  seedExportSample,
} from "../testing/export-sample-data";
import { exportSampleAsNative } from "../testing/native-export-fixture";
import { useTemporaryDirectory } from "../testing/temporary-directory";
import { useVaultDatabase } from "../testing/use-vault-database";
import { readZipEntries } from "../testing/zip-test-reader";

/**
 * 样例备份完成的时刻: 本地时间 2026-10-05 20:30.
 */
const COMPLETED_AT = new Date(2026, 9, 5, 20, 30).getTime();

describe("立即备份: 口令加密的备份发到邮箱", () => {
  const getDatabase = useVaultDatabase("email-send-encrypted");
  const getDirectory = useTemporaryDirectory("email-send-encrypted-dir");

  it("连接信息, 凭据与收发地址正确, 附件用口令解出后与导出一致", async () => {
    const { orm } = getDatabase();
    const exported = await exportSampleAsNative(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture);
    const result = await fixture.service.runBackup(RUN_WITH_ATTACHMENTS);
    const [recorded] = fixture.sent;
    expect(result).toMatchObject({
      ok: true,
      value: {
        status: "sent",
        summary: { completedAt: COMPLETED_AT, isEncrypted: true },
      },
    });
    expect(recorded?.connection).toEqual({
      host: "smtp.qq.com",
      port: 465,
      security: "ssl",
    });
    expect(recorded?.credentials).toEqual({
      user: "alice@qq.com",
      password: SAMPLE_AUTHORIZATION_CODE,
    });
    const decrypter = new Decrypter();
    decrypter.addPassphrase(SAMPLE_PASSPHRASE);
    const plain = Buffer.from(
      await decrypter.decrypt(new Uint8Array(recorded?.attachmentBytes ?? [])),
    );
    expect(readZipEntries(plain).map((entry) => entry.name)).toEqual(
      exported.entries.map((entry) => entry.name),
    );
  }, 60000);
});

describe("立即备份: 摘要与上次结果", () => {
  const getDatabase = useVaultDatabase("email-send-summary");
  const getDirectory = useTemporaryDirectory("email-send-summary-dir");

  it("摘要的计数与导出一致, 临时文件删除, 上次结果记成功", async () => {
    const { orm } = getDatabase();
    const exported = await exportSampleAsNative(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture, PLAINTEXT_SETTINGS);
    const result = await fixture.service.runBackup(RUN_WITH_ATTACHMENTS);
    expect(result).toMatchObject({
      ok: true,
      value: {
        summary: {
          entryCount: exported.payload.entryCount,
          attachmentCount: exported.payload.attachmentCount,
          includesAttachments: true,
          isEncrypted: false,
        },
      },
    });
    expect(await leftoverFiles(fixture)).toEqual([]);
    expect(fixture.service.getLastResult()).toEqual({
      ok: true,
      value: {
        completedAt: COMPLETED_AT,
        outcome: "success",
        triggerKind: "manual",
      },
    });
  });
});

describe("立即备份: 明文备份发到邮箱", () => {
  const getDatabase = useVaultDatabase("email-send-plain");
  const getDirectory = useTemporaryDirectory("email-send-plain-dir");

  it("附件是 ZIP, 内容与导出逐项相等, 收件邮箱可另填", async () => {
    const { orm } = getDatabase();
    const exported = await exportSampleAsNative(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture, {
      ...PLAINTEXT_SETTINGS,
      recipientAddress: "backup@example.com",
    });
    await fixture.service.runBackup(RUN_WITH_ATTACHMENTS);
    const [recorded] = fixture.sent;
    expect(recorded?.mail.to).toBe("backup@example.com");
    expect(recorded?.mail.attachment?.fileName).toBe(
      "radish-security-notes-backup-2026-10-05.zip",
    );
    const entries = readZipEntries(
      recorded?.attachmentBytes ?? Buffer.alloc(0),
    );
    const vault = (list: typeof entries): string | undefined =>
      list
        .find((entry) => entry.name === "vault.json")
        ?.content.toString("utf8");
    expect(vault(entries)).toBe(vault(exported.entries));
  });
});

describe("立即备份: 邮件正文", () => {
  const getDatabase = useVaultDatabase("email-send-body");
  const getDirectory = useTemporaryDirectory("email-send-body-dir");

  it("只带时间, 大小, 条目数, 附件与加密情况, 不含任何条目内容", async () => {
    const { orm } = getDatabase();
    seedExportSample(orm);
    const fixture = createEmailBackupFixture(() => orm, getDirectory());
    await saveSettings(fixture, PLAINTEXT_SETTINGS);
    await fixture.service.runBackup(RUN_WITH_ATTACHMENTS);
    const mail = fixture.sent[0]?.mail;
    expect(mail?.subject).toBe(
      'emailBackup.mail.backup.subject {"date":"2026-10-05"}',
    );
    expect(mail?.text).toContain('"time":"2026-10-05 20:30"');
    for (const secret of [SAMPLE_LOGIN_PASSWORD, SAMPLE_TOTP_SECRET]) {
      expect(JSON.stringify(mail)).not.toContain(secret);
    }
  });
});
