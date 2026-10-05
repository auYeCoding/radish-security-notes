import { describe, expect, it } from "vitest";

import {
  createEmailBackupFixture,
  SAMPLE_MASTER_PASSWORD,
  savedSettingsInput,
} from "../testing/email-backup-fixture";
import { useTemporaryDirectory } from "../testing/temporary-directory";
import { useVaultDatabase } from "../testing/use-vault-database";
import { readCredentials } from "./email-backup-credentials-repository";
import { readSettings } from "./email-backup-settings-repository";

/**
 * 不带授权码与口令的覆盖项, 模拟用户没有重填机密.
 */
const WITHOUT_SECRETS = { authorizationCode: undefined, passphrase: undefined };

describe("邮箱备份设置服务: 连接目标变了必须重填授权码", () => {
  const getDatabase = useVaultDatabase("email-settings-target");
  const getDirectory = useTemporaryDirectory("email-settings-target-dir");

  it("第一次保存必须带授权码", async () => {
    const { settings } = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    expect(
      await settings.save(savedSettingsInput({ authorizationCode: undefined })),
    ).toEqual({ ok: false, reason: "authorization-code-required" });
  });

  it("邮箱类型, 发件地址, 自定义服务器变了没重填就拒绝", async () => {
    const { settings } = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    await settings.save(savedSettingsInput());
    const changes = [
      { provider: "gmail" as const },
      { senderAddress: "carol@qq.com" },
      { provider: "custom" as const, host: "mail.example.com" },
    ];
    for (const change of changes) {
      expect(
        await settings.save(
          savedSettingsInput({ ...WITHOUT_SECRETS, ...change }),
        ),
      ).toEqual({ ok: false, reason: "authorization-code-required" });
    }
  });
});

describe("邮箱备份设置服务: 不需要或已重填授权码", () => {
  const getDatabase = useVaultDatabase("email-settings-target-ok");
  const getDirectory = useTemporaryDirectory("email-settings-target-ok-dir");

  it("只改收件邮箱与上限不用重填, 重填后改连接目标可以保存", async () => {
    const { settings } = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    await settings.save(savedSettingsInput());
    const recipient = await settings.save(
      savedSettingsInput({
        ...WITHOUT_SECRETS,
        recipientAddress: "dave@example.com",
        sizeLimitMebibytes: 30,
      }),
    );
    const switched = await settings.save(
      savedSettingsInput({
        provider: "gmail",
        senderAddress: "alice@gmail.com",
        authorizationCode: "gmailapppassword1",
      }),
    );
    expect(recipient).toMatchObject({ ok: true });
    expect(switched).toMatchObject({ ok: true, value: { provider: "gmail" } });
    expect(readCredentials(getDatabase().orm).authorizationCode).toBe(
      "gmailapppassword1",
    );
  });
});

describe("邮箱备份设置服务: 不支持与不合规的设置", () => {
  const getDatabase = useVaultDatabase("email-settings-invalid");
  const getDirectory = useTemporaryDirectory("email-settings-invalid-dir");

  it("Outlook 在主进程也被拒绝", async () => {
    const { settings } = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    expect(
      await settings.save(savedSettingsInput({ provider: "outlook" })),
    ).toEqual({ ok: false, reason: "unsupported-provider" });
  });

  it("不合规的字段返回 invalid-settings 且不写入", async () => {
    const { settings } = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    const invalidInputs = [
      savedSettingsInput({ senderAddress: "not-an-address" }),
      savedSettingsInput({ recipientAddress: "bad address@x.com" }),
      savedSettingsInput({ sizeLimitMebibytes: 0 }),
      savedSettingsInput({ sizeLimitMebibytes: 1.5 }),
      savedSettingsInput({ provider: "custom", host: "", port: 465 }),
      savedSettingsInput({ provider: "custom", host: "mail.x.com", port: 0 }),
    ];
    for (const input of invalidInputs) {
      expect(await settings.save(input)).toEqual({
        ok: false,
        reason: "invalid-settings",
      });
    }
    expect(readSettings(getDatabase().orm)).toBeUndefined();
  });
});

describe("邮箱备份设置服务: 主密码复核与锁定", () => {
  const getDatabase = useVaultDatabase("email-settings-master-password");
  const getDirectory = useTemporaryDirectory("email-settings-master-dir");

  it("设了主密码时保存要重输, 没给或不对都拒绝且不写入", async () => {
    const fixture = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    fixture.state.hasMasterPassword = true;
    const missing = await fixture.settings.save(savedSettingsInput());
    const wrong = await fixture.settings.save(
      savedSettingsInput({ masterPassword: "wrong" }),
    );
    expect(missing).toEqual({ ok: false, reason: "wrong-master-password" });
    expect(wrong).toEqual({ ok: false, reason: "wrong-master-password" });
    expect(readSettings(getDatabase().orm)).toBeUndefined();
  });

  it("主密码正确时保存成功, 视图不含主密码", async () => {
    const fixture = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    fixture.state.hasMasterPassword = true;
    const result = await fixture.settings.save(
      savedSettingsInput({ masterPassword: SAMPLE_MASTER_PASSWORD }),
    );
    expect(result).toMatchObject({
      ok: true,
      value: { isSaved: true, requiresMasterPassword: true },
    });
    expect(JSON.stringify(result)).not.toContain(SAMPLE_MASTER_PASSWORD);
  });

  it("未解锁时保存返回 vault-locked", async () => {
    const { settings } = createEmailBackupFixture(
      () => undefined,
      getDirectory(),
    );
    expect(await settings.save(savedSettingsInput())).toEqual({
      ok: false,
      reason: "vault-locked",
    });
  });
});
