import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { PRESET_ENTRY_TYPES } from "@shared/entries/preset-entry-types";

import { newEntryInputOf } from "../testing/entry-service-fixture";
import {
  createTotpServiceFixture,
  RFC_SHA1_SECRET,
} from "../testing/totp-service-fixture";
import {
  prepareMasterPasswordVault,
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import { TEST_MASTER_PASSWORD } from "../testing/vault-test-fixtures";

/**
 * 测试里用的另一个密钥, 用来核对数据库文件里搜不到 TOTP 密钥的各种形式.
 */
const DISK_SECRET = "JBSWY3DPEHPK3PXP";

describe("TOTP: 持久化", () => {
  const getHarness = useVaultServiceHarness();

  it("关闭重开并解锁后 TOTP 仍在, 验证码与密钥一致", async () => {
    const harness = getHarness();
    const vault = await startService(harness);
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    createTotpServiceFixture(vault).entries.create(
      newEntryInputOf({
        totp: `otpauth://totp/a?secret=${RFC_SHA1_SECRET}&digits=8`,
      }),
    );
    vault.close();

    const reopened = await startService(harness);
    await reopened.unlock(TEST_MASTER_PASSWORD);
    const { totp, entries } = createTotpServiceFixture(reopened, 59000);

    expect(totp.getCode("id-1")).toEqual({
      ok: true,
      value: { code: "94287082", expiresAt: 60000, periodSeconds: 30 },
    });
    expect(totp.revealSecret("id-1")).toEqual({
      ok: true,
      value: RFC_SHA1_SECRET,
    });
    expect(entries.get("id-1")).toMatchObject({
      ok: true,
      value: { hasTotp: true },
    });
  });

  it("每个预设类型都能带 TOTP", async () => {
    const vault = await startService(getHarness());
    await vault.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const { entries, totp } = createTotpServiceFixture(vault);

    const results = PRESET_ENTRY_TYPES.map((type) => {
      const created = entries.create(
        newEntryInputOf({
          type: type.key,
          fields: Object.fromEntries(
            type.fields.map((field) => [field.key, ""]),
          ),
          totp: RFC_SHA1_SECRET,
        }),
      );
      return created.ok ? totp.revealSecret(created.value.id) : created;
    });

    for (const result of results) {
      expect(result).toEqual({ ok: true, value: RFC_SHA1_SECRET });
    }
  });
});

describe("TOTP: 磁盘上没有明文", () => {
  const getHarness = useVaultServiceHarness();

  it("数据库文件里搜不到密钥的原始, 小写, 十六进制与 base64 形式, 也没有链接文本", async () => {
    const harness = getHarness();
    await prepareMasterPasswordVault(harness);
    const vault = await startService(harness);
    await vault.unlock(TEST_MASTER_PASSWORD);
    const { entries } = createTotpServiceFixture(vault);
    entries.create(
      newEntryInputOf({
        totp: `otpauth://totp/disk-label?secret=${DISK_SECRET}&issuer=disk-issuer`,
      }),
    );
    entries.create(newEntryInputOf({ totp: RFC_SHA1_SECRET }));
    vault.close();

    const content = await readFile(harness.paths.databaseFile);

    for (const secret of [DISK_SECRET, RFC_SHA1_SECRET, "disk-issuer"]) {
      const raw = Buffer.from(secret);
      expect(content.includes(raw)).toBe(false);
      expect(content.includes(Buffer.from(secret.toLowerCase()))).toBe(false);
      expect(content.includes(raw.toString("hex"))).toBe(false);
      expect(content.includes(raw.toString("base64"))).toBe(false);
    }
    expect(content.includes(Buffer.from("otpauth://"))).toBe(false);
  });
});
