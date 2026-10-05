import { describe, expect, it, vi } from "vitest";

import {
  FAST_ARGON2_PARAMETERS,
  TEST_MASTER_PASSWORD,
} from "../testing/vault-test-fixtures";
import { generateDataKey } from "./data-key";
import {
  KEY_RECORD_VERSION,
  SYSTEM_PROTECTION,
  type KeyRecord,
} from "./key-record";
import { protectWithMasterPassword } from "./master-password-key-protector";
import { createMasterPasswordVerifier } from "./master-password-verifier";

/**
 * 系统保护方式的密钥文件, 没有设主密码.
 */
const SYSTEM_RECORD: KeyRecord = {
  version: KEY_RECORD_VERSION,
  protection: SYSTEM_PROTECTION,
  wrappedDataKey: Buffer.from("opaque").toString("base64"),
};

/**
 * 用测试主密码与快速参数建主密码保护的密钥文件.
 * @returns 主密码保护的密钥文件内容.
 */
async function masterPasswordRecord(): Promise<KeyRecord> {
  return protectWithMasterPassword(
    generateDataKey(),
    TEST_MASTER_PASSWORD,
    FAST_ARGON2_PARAMETERS,
  );
}

describe("主密码校验器", () => {
  it("主密码保护的保险库: 设了主密码, 正确的主密码通过, 错误的被拒绝", async () => {
    const record = await masterPasswordRecord();
    const verifier = createMasterPasswordVerifier({ read: async () => record });
    expect(await verifier.hasMasterPassword()).toBe(true);
    expect(await verifier.verify(TEST_MASTER_PASSWORD)).toBe(true);
    expect(await verifier.verify("not the password")).toBe(false);
    expect(await verifier.verify("")).toBe(false);
  });

  it("系统保护 (跳过主密码) 的保险库没有主密码, 任何输入都不通过", async () => {
    const verifier = createMasterPasswordVerifier({
      read: async () => SYSTEM_RECORD,
    });
    expect(await verifier.hasMasterPassword()).toBe(false);
    expect(await verifier.verify(TEST_MASTER_PASSWORD)).toBe(false);
  });

  it("没有密钥文件时没有主密码", async () => {
    const verifier = createMasterPasswordVerifier({
      read: async () => undefined,
    });
    expect(await verifier.hasMasterPassword()).toBe(false);
    expect(await verifier.verify("x")).toBe(false);
  });

  it("读取密钥文件失败时错误原样抛出, 不当作密码错误", async () => {
    const verifier = createMasterPasswordVerifier({
      read: async () => {
        throw new Error("读取失败");
      },
    });
    await expect(verifier.verify("x")).rejects.toThrow("读取失败");
    await expect(verifier.hasMasterPassword()).rejects.toThrow("读取失败");
  });

  it("校验只读密钥文件, 不写任何东西", async () => {
    const record = await masterPasswordRecord();
    const read = vi.fn(async () => record);
    const verifier = createMasterPasswordVerifier({ read });
    await verifier.verify(TEST_MASTER_PASSWORD);
    expect(read).toHaveBeenCalledTimes(1);
    expect(Object.keys(verifier).sort()).toEqual([
      "hasMasterPassword",
      "verify",
    ]);
  });
});
