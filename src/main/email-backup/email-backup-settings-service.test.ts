import { describe, expect, it } from "vitest";

import {
  createEmailBackupFixture,
  SAMPLE_AUTHORIZATION_CODE,
  SAMPLE_PASSPHRASE,
  savedSettingsInput,
} from "../testing/email-backup-fixture";
import { useTemporaryDirectory } from "../testing/temporary-directory";
import { useVaultDatabase } from "../testing/use-vault-database";
import { readCredentials } from "./email-backup-credentials-repository";
import { readSettings } from "./email-backup-settings-repository";

describe("邮箱备份设置服务: 读取", () => {
  const getDatabase = useVaultDatabase("email-settings-read");
  const getDirectory = useTemporaryDirectory("email-settings-read-dir");

  it("没保存过时读到默认值, 所有已设置标志都为假", async () => {
    const { settings } = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    expect(await settings.getView()).toMatchObject({
      ok: true,
      value: {
        isSaved: false,
        provider: "qq",
        hasAuthorizationCode: false,
        hasPassphrase: false,
        requiresMasterPassword: false,
      },
    });
  });

  it("设了主密码时视图标明保存设置与立即备份要重输主密码", async () => {
    const fixture = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    fixture.state.hasMasterPassword = true;
    expect(await fixture.settings.getView()).toMatchObject({
      ok: true,
      value: { requiresMasterPassword: true },
    });
  });
});

describe("邮箱备份设置服务: 保存后读回", () => {
  const getDatabase = useVaultDatabase("email-settings-save");
  const getDirectory = useTemporaryDirectory("email-settings-save-dir");

  it("视图只带已设置标志, 不含授权码与口令", async () => {
    const { settings } = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    const saved = await settings.save(savedSettingsInput());
    const read = await settings.getView();
    expect(saved).toMatchObject({
      ok: true,
      value: {
        isSaved: true,
        senderAddress: "alice@qq.com",
        hasAuthorizationCode: true,
        hasPassphrase: true,
      },
    });
    for (const result of [saved, read]) {
      expect(JSON.stringify(result)).not.toContain(SAMPLE_AUTHORIZATION_CODE);
      expect(JSON.stringify(result)).not.toContain(SAMPLE_PASSPHRASE);
    }
    expect(read).toEqual(saved);
  });

  it("授权码与口令存进机密表, 设置表里没有", async () => {
    const { settings } = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    await settings.save(savedSettingsInput());
    const { orm } = getDatabase();
    expect(readCredentials(orm)).toEqual({
      authorizationCode: SAMPLE_AUTHORIZATION_CODE,
      passphrase: SAMPLE_PASSPHRASE,
    });
    expect(JSON.stringify(readSettings(orm))).not.toContain(
      SAMPLE_AUTHORIZATION_CODE,
    );
  });
});

describe("邮箱备份设置服务: 预置与自定义服务器", () => {
  const getDatabase = useVaultDatabase("email-settings-server");
  const getDirectory = useTemporaryDirectory("email-settings-server-dir");

  it("预置类型的服务器取预置表, 不信任请求里的值", async () => {
    const { settings } = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    await settings.save(
      savedSettingsInput({
        host: "evil.example",
        port: 25,
        security: "starttls",
      }),
    );
    expect(readSettings(getDatabase().orm)).toMatchObject({
      host: "smtp.qq.com",
      port: 465,
      security: "ssl",
    });
  });

  it("自定义类型保存用户填写的服务器, 地址去首尾空格", async () => {
    const { settings } = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    await settings.save(
      savedSettingsInput({
        provider: "custom",
        host: " mail.example.com ",
        port: 587,
        security: "starttls",
        senderAddress: " bob@example.com ",
      }),
    );
    expect(readSettings(getDatabase().orm)).toMatchObject({
      host: "mail.example.com",
      port: 587,
      security: "starttls",
      senderAddress: "bob@example.com",
    });
  });
});

describe("邮箱备份设置服务: 保留与替换机密", () => {
  const getDatabase = useVaultDatabase("email-settings-secrets");
  const getDirectory = useTemporaryDirectory("email-settings-secrets-dir");

  it("授权码与口令没给或空串时保持已保存的值不变", async () => {
    const { settings } = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    await settings.save(savedSettingsInput());
    const kept = await settings.save(
      savedSettingsInput({
        authorizationCode: "",
        passphrase: undefined,
        sizeLimitMebibytes: 20,
      }),
    );
    expect(kept).toMatchObject({ ok: true, value: { sizeLimitMebibytes: 20 } });
    expect(readCredentials(getDatabase().orm)).toEqual({
      authorizationCode: SAMPLE_AUTHORIZATION_CODE,
      passphrase: SAMPLE_PASSPHRASE,
    });
  });

  it("给了新的授权码与口令就替换", async () => {
    const { settings } = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    await settings.save(savedSettingsInput());
    await settings.save(
      savedSettingsInput({
        authorizationCode: "newcodenewcodenew",
        passphrase: "another long passphrase",
      }),
    );
    expect(readCredentials(getDatabase().orm)).toEqual({
      authorizationCode: "newcodenewcodenew",
      passphrase: "another long passphrase",
    });
  });
});
