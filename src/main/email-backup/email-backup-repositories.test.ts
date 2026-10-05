import { describe, expect, it } from "vitest";

import { DEFAULT_EMAIL_BACKUP_SETTINGS } from "@shared/email-backup/email-backup-settings";

import { useVaultDatabase } from "../testing/use-vault-database";
import {
  readCredentials,
  writeCredentials,
} from "./email-backup-credentials-repository";
import {
  readLastResult,
  writeLastResult,
} from "./email-backup-last-result-repository";
import {
  readSettings,
  writeSettings,
} from "./email-backup-settings-repository";

describe("邮箱备份设置表", () => {
  const getDatabase = useVaultDatabase("email-repository-settings");

  it("没保存过时读到 undefined, 保存后读回, 再保存覆盖同一行", () => {
    const { orm } = getDatabase();
    expect(readSettings(orm)).toBeUndefined();
    const settings = {
      ...DEFAULT_EMAIL_BACKUP_SETTINGS,
      senderAddress: "a@qq.com",
    };
    writeSettings(orm, settings);
    expect(readSettings(orm)).toEqual(settings);
    writeSettings(orm, {
      ...settings,
      sizeLimitMebibytes: 7,
      isEncrypted: false,
    });
    expect(readSettings(orm)).toEqual({
      ...settings,
      sizeLimitMebibytes: 7,
      isEncrypted: false,
    });
  });
});

describe("邮箱备份机密表", () => {
  const getDatabase = useVaultDatabase("email-repository-credentials");

  it("没保存过时两项都为 undefined, 保存后读回, 清空的项读回 undefined", () => {
    const { orm } = getDatabase();
    expect(readCredentials(orm)).toEqual({
      authorizationCode: undefined,
      passphrase: undefined,
    });
    writeCredentials(orm, { authorizationCode: "code", passphrase: "phrase" });
    expect(readCredentials(orm)).toEqual({
      authorizationCode: "code",
      passphrase: "phrase",
    });
    writeCredentials(orm, { authorizationCode: "code", passphrase: undefined });
    expect(readCredentials(orm)).toEqual({
      authorizationCode: "code",
      passphrase: undefined,
    });
  });
});

describe("上次备份结果表", () => {
  const getDatabase = useVaultDatabase("email-repository-last-result");

  it("没备份过时读到 undefined, 成功与失败的结果都能读回并覆盖上一次", () => {
    const { orm } = getDatabase();
    expect(readLastResult(orm)).toBeUndefined();
    writeLastResult(orm, { completedAt: 1, outcome: "success" });
    expect(readLastResult(orm)).toEqual({ completedAt: 1, outcome: "success" });
    writeLastResult(orm, {
      completedAt: 2,
      outcome: "failure",
      reason: "connection-failed",
    });
    expect(readLastResult(orm)).toEqual({
      completedAt: 2,
      outcome: "failure",
      reason: "connection-failed",
    });
  });
});
