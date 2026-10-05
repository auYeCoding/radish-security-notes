import { describe, expect, it } from "vitest";

import {
  createEmailBackupFixture,
  savedSettingsInput,
} from "../testing/email-backup-fixture";
import { useTemporaryDirectory } from "../testing/temporary-directory";
import { useVaultDatabase } from "../testing/use-vault-database";
import { readCredentials } from "./email-backup-credentials-repository";
import { readSettings } from "./email-backup-settings-repository";

describe("邮箱备份设置服务: 明文风险确认", () => {
  const getDatabase = useVaultDatabase("email-settings-plaintext");
  const getDirectory = useTemporaryDirectory("email-settings-plaintext-dir");

  it("不加密时必须确认明文风险, 确认后保存并清除已保存的口令", async () => {
    const { settings } = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    await settings.save(savedSettingsInput());
    const unconfirmed = await settings.save(
      savedSettingsInput({ isEncrypted: false }),
    );
    const confirmed = await settings.save(
      savedSettingsInput({
        isEncrypted: false,
        hasAcknowledgedPlaintextRisk: true,
      }),
    );
    expect(unconfirmed).toEqual({
      ok: false,
      reason: "plaintext-not-acknowledged",
    });
    expect(confirmed).toMatchObject({
      ok: true,
      value: { isEncrypted: false, hasPassphrase: false },
    });
    expect(readCredentials(getDatabase().orm).passphrase).toBeUndefined();
  });

  it("改回加密时不保留明文风险确认", async () => {
    const { settings } = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    await settings.save(
      savedSettingsInput({
        isEncrypted: false,
        hasAcknowledgedPlaintextRisk: true,
      }),
    );
    const encrypted = await settings.save(
      savedSettingsInput({ hasAcknowledgedPlaintextRisk: true }),
    );
    expect(encrypted).toMatchObject({
      ok: true,
      value: { isEncrypted: true, hasAcknowledgedPlaintextRisk: false },
    });
  });
});

describe("邮箱备份设置服务: 备份口令规则", () => {
  const getDatabase = useVaultDatabase("email-settings-passphrase");
  const getDirectory = useTemporaryDirectory("email-settings-passphrase-dir");

  it("加密时必须有符合规则的口令, 不合规时不写入", async () => {
    const { settings } = createEmailBackupFixture(
      () => getDatabase().orm,
      getDirectory(),
    );
    const missing = await settings.save(
      savedSettingsInput({ passphrase: undefined }),
    );
    const tooShort = await settings.save(
      savedSettingsInput({ passphrase: "short" }),
    );
    expect(missing).toEqual({ ok: false, reason: "invalid-passphrase" });
    expect(tooShort).toEqual({ ok: false, reason: "invalid-passphrase" });
    expect(readSettings(getDatabase().orm)).toBeUndefined();
  });
});
