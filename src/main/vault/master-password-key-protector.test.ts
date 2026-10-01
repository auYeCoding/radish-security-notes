import { describe, expect, it } from "vitest";

import {
  FAST_ARGON2_PARAMETERS,
  TEST_MASTER_PASSWORD,
} from "../testing/vault-test-fixtures";
import { KeyUnwrapError } from "./aes-gcm-key-wrapper";
import { generateDataKey } from "./data-key";
import type { MasterPasswordKeyRecord } from "./key-record";
import {
  protectWithMasterPassword,
  unprotectWithMasterPassword,
} from "./master-password-key-protector";

/**
 * 用测试主密码与快速参数保护一个数据密钥.
 * @param dataKey 被保护的数据密钥.
 * @returns 主密码保护记录.
 */
function protectForTest(dataKey: Buffer): Promise<MasterPasswordKeyRecord> {
  return protectWithMasterPassword(
    dataKey,
    TEST_MASTER_PASSWORD,
    FAST_ARGON2_PARAMETERS,
  );
}

describe("protectWithMasterPassword 与 unprotectWithMasterPassword", () => {
  it("正确的主密码能解出原来的数据密钥", async () => {
    const dataKey = generateDataKey();
    const record = await protectForTest(dataKey);

    const unprotected = await unprotectWithMasterPassword(
      record,
      TEST_MASTER_PASSWORD,
    );

    expect(unprotected.equals(dataKey)).toBe(true);
  });

  it("错误的主密码解包失败", async () => {
    const record = await protectForTest(generateDataKey());

    await expect(
      unprotectWithMasterPassword(record, `${TEST_MASTER_PASSWORD}!`),
    ).rejects.toBeInstanceOf(KeyUnwrapError);
  });

  it("记录保存成本参数, 不含主密码与明文数据密钥", async () => {
    const dataKey = generateDataKey();

    const record = await protectForTest(dataKey);

    const serialized = JSON.stringify(record);
    expect(record.keyDerivation).toMatchObject({
      algorithm: "argon2id",
      ...FAST_ARGON2_PARAMETERS,
    });
    expect(serialized).not.toContain(TEST_MASTER_PASSWORD);
    expect(serialized).not.toContain(dataKey.toString("hex"));
    expect(serialized).not.toContain(dataKey.toString("base64"));
  });
});

describe("unprotectWithMasterPassword 拒绝被篡改的记录", () => {
  it("包裹数据被篡改时解包失败", async () => {
    const record = await protectForTest(generateDataKey());
    const ciphertext = Buffer.from(record.wrappedDataKey.ciphertext, "base64");
    ciphertext[0] = ciphertext[0] ^ 0xff;
    const tampered = {
      ...record,
      wrappedDataKey: {
        ...record.wrappedDataKey,
        ciphertext: ciphertext.toString("base64"),
      },
    };

    await expect(
      unprotectWithMasterPassword(tampered, TEST_MASTER_PASSWORD),
    ).rejects.toBeInstanceOf(KeyUnwrapError);
  });

  it("盐被篡改时解包失败", async () => {
    const record = await protectForTest(generateDataKey());
    const tampered = {
      ...record,
      keyDerivation: {
        ...record.keyDerivation,
        salt: Buffer.alloc(16, 7).toString("base64"),
      },
    };

    await expect(
      unprotectWithMasterPassword(tampered, TEST_MASTER_PASSWORD),
    ).rejects.toBeInstanceOf(KeyUnwrapError);
  });
});
