import { describe, expect, it } from "vitest";

import {
  FAST_ARGON2_PARAMETERS,
  TEST_MASTER_PASSWORD,
  createFakeSafeStorage,
} from "../testing/vault-test-fixtures";
import { unprotectDataKey } from "./data-key-unprotector";
import { generateDataKey } from "./data-key";
import { protectWithMasterPassword } from "./master-password-key-protector";
import { protectWithSystem } from "./system-key-protector";

/**
 * 与测试主密码不同的另一个主密码.
 */
const OTHER_PASSWORD = "another strong password";

describe("unprotectDataKey 主密码保护", () => {
  it("主密码正确时解出同一个数据密钥", async () => {
    const dataKey = generateDataKey();
    const record = await protectWithMasterPassword(
      dataKey,
      TEST_MASTER_PASSWORD,
      FAST_ARGON2_PARAMETERS,
    );

    const result = await unprotectDataKey(
      record,
      TEST_MASTER_PASSWORD,
      createFakeSafeStorage(),
    );

    expect(result.outcome).toBe("unprotected");
    if (result.outcome === "unprotected") {
      expect(result.dataKey.equals(dataKey)).toBe(true);
    }
  });

  it("主密码不对时返回主密码不对, 不抛错", async () => {
    const record = await protectWithMasterPassword(
      generateDataKey(),
      TEST_MASTER_PASSWORD,
      FAST_ARGON2_PARAMETERS,
    );

    const result = await unprotectDataKey(
      record,
      OTHER_PASSWORD,
      createFakeSafeStorage(),
    );

    expect(result).toEqual({ outcome: "wrong-password" });
  });

  it("没有给出主密码时返回需要主密码, 不去尝试解开", async () => {
    const record = await protectWithMasterPassword(
      generateDataKey(),
      TEST_MASTER_PASSWORD,
      FAST_ARGON2_PARAMETERS,
    );

    const result = await unprotectDataKey(
      record,
      undefined,
      createFakeSafeStorage(),
    );

    expect(result).toEqual({ outcome: "password-required" });
  });
});

describe("unprotectDataKey 系统保护", () => {
  it("不需要主密码, 解出同一个数据密钥", async () => {
    const safeStorage = createFakeSafeStorage();
    const dataKey = generateDataKey();
    const record = await protectWithSystem(dataKey, safeStorage);

    const result = await unprotectDataKey(record, undefined, safeStorage);

    expect(result.outcome).toBe("unprotected");
    if (result.outcome === "unprotected") {
      expect(result.dataKey.equals(dataKey)).toBe(true);
    }
  });

  it("给出了主密码也忽略, 仍然解出数据密钥", async () => {
    const safeStorage = createFakeSafeStorage();
    const record = await protectWithSystem(generateDataKey(), safeStorage);

    const result = await unprotectDataKey(record, OTHER_PASSWORD, safeStorage);

    expect(result.outcome).toBe("unprotected");
  });

  it("系统解密失败时原样抛出, 不当作主密码不对", async () => {
    const record = await protectWithSystem(
      generateDataKey(),
      createFakeSafeStorage(),
    );

    await expect(
      unprotectDataKey(
        record,
        undefined,
        createFakeSafeStorage({ isDecryptionFailing: true }),
      ),
    ).rejects.toThrow("系统解密失败");
  });
});
