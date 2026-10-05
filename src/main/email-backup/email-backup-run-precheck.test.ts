import { describe, expect, it } from "vitest";

import {
  DEFAULT_EMAIL_BACKUP_SETTINGS,
  type EmailBackupSettings,
} from "@shared/email-backup/email-backup-settings";

import {
  createEmailBackupFixture,
  SAMPLE_AUTHORIZATION_CODE,
} from "../testing/email-backup-fixture";
import { RUN_WITH_ATTACHMENTS } from "../testing/email-backup-test-helpers";
import { seedExportSample } from "../testing/export-sample-data";
import { useTemporaryDirectory } from "../testing/temporary-directory";
import { useVaultDatabase } from "../testing/use-vault-database";
import type { VaultOrm } from "../vault/database/drizzle-adapter";
import { writeCredentials } from "./email-backup-credentials-repository";
import { writeSettings } from "./email-backup-settings-repository";

/**
 * 库里已保存的基础设置: QQ 邮箱, 发件地址已填.
 */
const BASE: EmailBackupSettings = {
  ...DEFAULT_EMAIL_BACKUP_SETTINGS,
  senderAddress: "a@qq.com",
};

/**
 * 立即备份的结果与替身发送的邮件数.
 */
interface StoredStateRun {
  /**
   * 立即备份的结果.
   */
  readonly result: unknown;
  /**
   * 替身发送能力收到的邮件数.
   */
  readonly sentCount: number;
}

/**
 * 把一份不一致的状态直接写进库里, 再立即备份.
 * @param orm 已解锁数据库的查询入口.
 * @param directory 测试用的临时目录.
 * @param overrides 覆盖基础设置的字段.
 * @returns 立即备份的结果与替身发送的邮件数.
 */
async function runWithStoredState(
  orm: VaultOrm,
  directory: string,
  overrides: Partial<EmailBackupSettings>,
): Promise<StoredStateRun> {
  seedExportSample(orm);
  const fixture = createEmailBackupFixture(() => orm, directory);
  writeCredentials(orm, {
    authorizationCode: SAMPLE_AUTHORIZATION_CODE,
    passphrase: undefined,
  });
  writeSettings(orm, { ...BASE, ...overrides });
  const result = await fixture.service.runBackup(RUN_WITH_ATTACHMENTS);
  return { result, sentCount: fixture.sent.length };
}

describe("立即备份: 库里是不一致的状态时逐项拒绝", () => {
  const getDatabase = useVaultDatabase("email-precheck");
  const getDirectory = useTemporaryDirectory("email-precheck-dir");

  it.each([
    ["加密却没有口令", { isEncrypted: true }, "passphrase-missing"],
    ["明文却没确认风险", { isEncrypted: false }, "plaintext-not-acknowledged"],
    [
      "保存的是 Outlook",
      {
        provider: "outlook" as const,
        isEncrypted: false,
        hasAcknowledgedPlaintextRisk: true,
      },
      "unsupported-provider",
    ],
  ])("%s", async (_name, overrides, reason) => {
    const { result, sentCount } = await runWithStoredState(
      getDatabase().orm,
      getDirectory(),
      overrides,
    );
    expect(result).toEqual({ ok: false, reason });
    expect(sentCount).toBe(0);
  });
});
