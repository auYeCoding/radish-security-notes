import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  SAMPLE_AUTHORIZATION_CODE,
  SAMPLE_PASSPHRASE,
  SAMPLE_SENDER_ADDRESS,
  savedSettingsInput,
} from "../testing/email-backup-fixture";
import { MIGRATIONS_FOLDER } from "../testing/migrations-folder";
import { useTemporaryDirectory } from "../testing/temporary-directory";
import {
  openVaultDatabase,
  type VaultDatabase,
} from "../vault/database/open-vault-database";
import { createEmailBackupAuthorization } from "./email-backup-authorization";
import { readCredentials } from "./email-backup-credentials-repository";
import {
  readLastResult,
  writeLastResult,
} from "./email-backup-last-result-repository";
import { EmailBackupSettingsService } from "./email-backup-settings-service";

/**
 * 没设主密码的身份复核.
 */
const NO_MASTER_PASSWORD = createEmailBackupAuthorization({
  hasMasterPassword: () => Promise.resolve(false),
  verify: () => Promise.resolve(false),
});

/**
 * 在一个已打开的数据库上创建设置服务.
 * @param database 已打开的数据库.
 * @returns 设置服务.
 */
function serviceOn(database: VaultDatabase): EmailBackupSettingsService {
  return new EmailBackupSettingsService({
    database: { getOrm: () => database.orm, onFailure: () => undefined },
    authorization: NO_MASTER_PASSWORD,
  });
}

/**
 * 用同一个数据库文件与密钥打开数据库.
 * @param directory 数据库文件所在的目录.
 * @param dataKey 数据密钥.
 * @returns 已打开的数据库.
 */
function openWith(directory: string, dataKey: Buffer): VaultDatabase {
  return openVaultDatabase({
    databaseFile: join(directory, "vault.db"),
    dataKey: Buffer.from(dataKey),
    migrationsFolder: MIGRATIONS_FOLDER,
  });
}

describe("邮箱备份: 重启后保留", () => {
  const getDirectory = useTemporaryDirectory("email-persistence");

  it("关闭再用同一密钥打开后, 设置, 机密与上次结果都还在", async () => {
    const dataKey = randomBytes(32);
    const first = openWith(getDirectory(), dataKey);
    await serviceOn(first).save(savedSettingsInput());
    writeLastResult(first.orm, {
      completedAt: 1234,
      outcome: "failure",
      reason: "authentication-failed",
    });
    first.close();
    const second = openWith(getDirectory(), dataKey);
    expect(await serviceOn(second).getView()).toMatchObject({
      ok: true,
      value: { isSaved: true, senderAddress: SAMPLE_SENDER_ADDRESS },
    });
    expect(readCredentials(second.orm).authorizationCode).toBe(
      SAMPLE_AUTHORIZATION_CODE,
    );
    expect(readLastResult(second.orm)).toMatchObject({
      outcome: "failure",
      reason: "authentication-failed",
    });
    second.close();
  });

  it("数据库文件里没有授权码, 口令与邮箱地址的明文", async () => {
    const first = openWith(getDirectory(), randomBytes(32));
    await serviceOn(first).save(savedSettingsInput());
    first.close();
    const raw = await readFile(join(getDirectory(), "vault.db"));
    for (const plain of [
      SAMPLE_AUTHORIZATION_CODE,
      SAMPLE_PASSPHRASE,
      SAMPLE_SENDER_ADDRESS,
    ]) {
      expect(raw.includes(Buffer.from(plain))).toBe(false);
    }
  });
});
