import { describe, expect, it } from "vitest";

import { DEFAULT_EMAIL_BACKUP_SETTINGS } from "@shared/email-backup/email-backup-settings";
import { EMAIL_BACKUP_TRIGGER_KINDS } from "@shared/email-backup/email-backup-trigger-kind";

import { useVaultDatabase } from "../testing/use-vault-database";
import {
  readCredentials,
  writeCredentials,
} from "./email-backup-credentials-repository";
import {
  readLastResult,
  readLastSuccessAt,
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
    writeLastResult(orm, {
      completedAt: 1,
      outcome: "success",
      triggerKind: "manual",
    });
    expect(readLastResult(orm)).toEqual({
      completedAt: 1,
      outcome: "success",
      triggerKind: "manual",
    });
    writeLastResult(orm, {
      completedAt: 2,
      outcome: "failure",
      reason: "connection-failed",
      triggerKind: "scheduled",
    });
    expect(readLastResult(orm)).toEqual({
      completedAt: 2,
      outcome: "failure",
      reason: "connection-failed",
      triggerKind: "scheduled",
    });
  });

  it("触发方式的三种取值都能读回", () => {
    const { orm } = getDatabase();
    for (const triggerKind of EMAIL_BACKUP_TRIGGER_KINDS) {
      writeLastResult(orm, { completedAt: 3, outcome: "success", triggerKind });
      expect(readLastResult(orm)?.triggerKind).toBe(triggerKind);
    }
  });
});

describe("最近一次成功备份的时刻", () => {
  const getDatabase = useVaultDatabase("email-repository-last-success");

  it("没备份过时为 undefined, 成功时更新, 失败时保留, 下次成功再更新", () => {
    const { orm } = getDatabase();
    expect(readLastSuccessAt(orm)).toBeUndefined();
    writeLastResult(orm, {
      completedAt: 10,
      outcome: "failure",
      reason: "send-failed",
      triggerKind: "scheduled",
    });
    expect(readLastSuccessAt(orm)).toBeUndefined();
    writeLastResult(orm, {
      completedAt: 20,
      outcome: "success",
      triggerKind: "catch-up",
    });
    expect(readLastSuccessAt(orm)).toBe(20);
    writeLastResult(orm, {
      completedAt: 30,
      outcome: "failure",
      reason: "send-failed",
      triggerKind: "manual",
    });
    expect(readLastSuccessAt(orm)).toBe(20);
    writeLastResult(orm, {
      completedAt: 40,
      outcome: "success",
      triggerKind: "manual",
    });
    expect(readLastSuccessAt(orm)).toBe(40);
  });
});
