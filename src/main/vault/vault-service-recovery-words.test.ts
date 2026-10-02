import { describe, expect, it } from "vitest";

import {
  startService,
  useVaultServiceHarness,
} from "../testing/vault-service-harness";
import {
  TEST_MASTER_PASSWORD,
  createFakeSafeStorage,
} from "../testing/vault-test-fixtures";
import { doesDatabaseAcceptKey } from "./database/database-key-check";
import { recoveryWordsToDataKey } from "./recovery-phrase";
import { unprotectWithMasterPassword } from "./master-password-key-protector";
import { unprotectWithSystem } from "./system-key-protector";

describe("VaultService 设置时给出恢复词 (主密码路线)", () => {
  const getHarness = useVaultServiceHarness();

  it("成功时给出 24 个词, 失败时不给词", async () => {
    const service = await startService(getHarness());

    const tooShort = await service.setupWithMasterPassword("short");
    const accepted =
      await service.setupWithMasterPassword(TEST_MASTER_PASSWORD);

    expect(tooShort).toEqual({ ok: false, reason: "password-too-short" });
    expect(accepted.ok && accepted.recoveryWords).toHaveLength(24);
  });

  it("词还原出的数据密钥就是密钥文件里被保护的那个, 并能打开数据库", async () => {
    const harness = getHarness();
    const service = await startService(harness);
    const result = await service.setupWithMasterPassword(TEST_MASTER_PASSWORD);
    const record = await harness.keyFileStore.read();
    if (!result.ok || record?.protection !== "master-password") {
      throw new Error("测试前提不成立");
    }

    const fromWords = recoveryWordsToDataKey(result.recoveryWords);
    const fromRecord = await unprotectWithMasterPassword(
      record,
      TEST_MASTER_PASSWORD,
    );

    expect(fromWords.equals(fromRecord)).toBe(true);
    expect(
      await doesDatabaseAcceptKey(harness.paths.databaseFile, fromWords),
    ).toBe(true);
  });
});

describe("VaultService 设置时给出恢复词 (跳过路线)", () => {
  const getHarness = useVaultServiceHarness();

  it("词还原出的数据密钥就是系统保护的那个, 并能打开数据库", async () => {
    const harness = getHarness();
    const safeStorage = createFakeSafeStorage();
    const service = await startService(harness, { safeStorage });
    const result = await service.setupWithoutMasterPassword();
    const record = await harness.keyFileStore.read();
    if (!result.ok || record?.protection !== "system-protected") {
      throw new Error("测试前提不成立");
    }

    const fromWords = recoveryWordsToDataKey(result.recoveryWords);
    const fromRecord = await unprotectWithSystem(record, safeStorage);

    expect(fromWords.equals(fromRecord.dataKey)).toBe(true);
    expect(
      await doesDatabaseAcceptKey(harness.paths.databaseFile, fromWords),
    ).toBe(true);
  });

  it("系统不能保护时失败, 不给词", async () => {
    const service = await startService(getHarness(), {
      safeStorage: createFakeSafeStorage({ isAvailable: false }),
    });

    expect(await service.setupWithoutMasterPassword()).toEqual({
      ok: false,
      reason: "system-protection-unavailable",
    });
  });
});
