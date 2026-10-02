import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createSampleEncryptedVault } from "../testing/sample-encrypted-vault";
import { useTemporaryDirectory } from "../testing/temporary-directory";
import {
  dataKeyToRecoveryWords,
  recoveryWordsToDataKey,
} from "./recovery-phrase";
import { VaultRecovery, type RecoveryKeyProtection } from "./vault-recovery";

/**
 * 测试用的新主密码.
 */
const NEW_PASSWORD = "another strong password";

/**
 * 长度不够的主密码.
 */
const SHORT_PASSWORD = "short";

/**
 * 假的密钥保护写入器的行为选项.
 */
interface ProtectionStubOptions {
  /**
   * 系统保护是否写入成功, 默认成功.
   */
  readonly isSystemWritten?: boolean;
  /**
   * 写入时抛出的错误, 默认不抛.
   */
  readonly error?: Error;
}

/**
 * 假的密钥保护写入器和它收到的数据密钥.
 */
interface ProtectionStub {
  /**
   * 交给被测对象的写入器.
   */
  readonly keyProtection: RecoveryKeyProtection;
  /**
   * 写入器依次收到的数据密钥缓冲区, 保留引用以便检查是否被清零.
   */
  readonly receivedKeys: Buffer[];
  /**
   * 写入器收到的新主密码.
   */
  readonly receivedPasswords: string[];
}

/**
 * 创建假的密钥保护写入器, 记录收到的数据密钥与主密码, 不写任何文件.
 * @param options 行为选项.
 * @returns 假的写入器和它的记录.
 */
function createProtectionStub(
  options: ProtectionStubOptions = {},
): ProtectionStub {
  const receivedKeys: Buffer[] = [];
  const receivedPasswords: string[] = [];
  const keyProtection: RecoveryKeyProtection = {
    writeMasterPasswordProtection: async (dataKey, masterPassword) => {
      receivedKeys.push(dataKey);
      receivedPasswords.push(masterPassword);
      if (options.error !== undefined) {
        throw options.error;
      }
    },
    writeSystemProtection: async (dataKey) => {
      receivedKeys.push(dataKey);
      if (options.error !== undefined) {
        throw options.error;
      }
      return options.isSystemWritten ?? true;
    },
  };
  return { keyProtection, receivedKeys, receivedPasswords };
}

/**
 * 判断缓冲区是否已全部清零.
 * @param buffer 要检查的缓冲区.
 * @returns 全为零返回 true.
 */
function isZeroed(buffer: Buffer): boolean {
  return buffer.every((byte) => byte === 0);
}

describe("VaultRecovery 校验恢复词", () => {
  const getDirectory = useTemporaryDirectory("vault-recovery");

  it("正确的词通过校验, 不写任何保护", async () => {
    const { databaseFile, words } = createSampleEncryptedVault(getDirectory());
    const stub = createProtectionStub();

    const result = await new VaultRecovery({
      databaseFile,
      keyProtection: stub.keyProtection,
    }).verifyWords(words);

    expect(result).toEqual({ ok: true });
    expect(stub.receivedKeys).toHaveLength(0);
  });

  it("词数不对时带原因失败", async () => {
    const { databaseFile, words } = createSampleEncryptedVault(getDirectory());

    const result = await new VaultRecovery({
      databaseFile,
      keyProtection: createProtectionStub().keyProtection,
    }).verifyWords(words.slice(0, 23));

    expect(result).toEqual({ ok: false, reason: "recovery-word-count" });
  });

  it("词合法但不是这个保险库的时失败", async () => {
    const { databaseFile } = createSampleEncryptedVault(getDirectory());
    const otherWords = dataKeyToRecoveryWords(randomBytes(32));

    const result = await new VaultRecovery({
      databaseFile,
      keyProtection: createProtectionStub().keyProtection,
    }).verifyWords(otherWords);

    expect(result).toEqual({ ok: false, reason: "recovery-key-rejected" });
  });
});

describe("VaultRecovery 换上新主密码", () => {
  const getDirectory = useTemporaryDirectory("vault-recovery");

  it("成功时交出还原出的数据密钥, 并把新主密码交给写入器", async () => {
    const { databaseFile, words } = createSampleEncryptedVault(getDirectory());
    const stub = createProtectionStub();

    const recovery = await new VaultRecovery({
      databaseFile,
      keyProtection: stub.keyProtection,
    }).recoverWithMasterPassword(words, NEW_PASSWORD);

    expect(recovery.ok).toBe(true);
    if (recovery.ok) {
      expect(recovery.dataKey.equals(recoveryWordsToDataKey(words))).toBe(true);
    }
    expect(stub.receivedPasswords).toEqual([NEW_PASSWORD]);
  });

  it("新主密码太短时失败, 不写保护", async () => {
    const { databaseFile, words } = createSampleEncryptedVault(getDirectory());
    const stub = createProtectionStub();

    const recovery = await new VaultRecovery({
      databaseFile,
      keyProtection: stub.keyProtection,
    }).recoverWithMasterPassword(words, SHORT_PASSWORD);

    expect(recovery).toEqual({ ok: false, reason: "password-too-short" });
    expect(stub.receivedKeys).toHaveLength(0);
  });

  it("词有问题时先于密码检查失败, 不写保护", async () => {
    const { databaseFile, words } = createSampleEncryptedVault(getDirectory());
    const stub = createProtectionStub();

    const recovery = await new VaultRecovery({
      databaseFile,
      keyProtection: stub.keyProtection,
    }).recoverWithMasterPassword(words.slice(0, 23), SHORT_PASSWORD);

    expect(recovery).toEqual({ ok: false, reason: "recovery-word-count" });
    expect(stub.receivedKeys).toHaveLength(0);
  });

  it("写入器抛错时向上抛出, 数据密钥已清零", async () => {
    const { databaseFile, words } = createSampleEncryptedVault(getDirectory());
    const stub = createProtectionStub({ error: new Error("写入失败") });

    await expect(
      new VaultRecovery({
        databaseFile,
        keyProtection: stub.keyProtection,
      }).recoverWithMasterPassword(words, NEW_PASSWORD),
    ).rejects.toThrow("写入失败");

    expect(stub.receivedKeys).toHaveLength(1);
    expect(isZeroed(stub.receivedKeys[0])).toBe(true);
  });
});

describe("VaultRecovery 改用系统保护", () => {
  const getDirectory = useTemporaryDirectory("vault-recovery");

  it("成功时交出还原出的数据密钥", async () => {
    const { databaseFile, words } = createSampleEncryptedVault(getDirectory());
    const stub = createProtectionStub();

    const recovery = await new VaultRecovery({
      databaseFile,
      keyProtection: stub.keyProtection,
    }).recoverWithSystemProtection(words);

    expect(recovery.ok).toBe(true);
    if (recovery.ok) {
      expect(recovery.dataKey.equals(recoveryWordsToDataKey(words))).toBe(true);
    }
  });

  it("系统不能保护时失败, 数据密钥已清零", async () => {
    const { databaseFile, words } = createSampleEncryptedVault(getDirectory());
    const stub = createProtectionStub({ isSystemWritten: false });

    const recovery = await new VaultRecovery({
      databaseFile,
      keyProtection: stub.keyProtection,
    }).recoverWithSystemProtection(words);

    expect(recovery).toEqual({
      ok: false,
      reason: "system-protection-unavailable",
    });
    expect(isZeroed(stub.receivedKeys[0])).toBe(true);
  });
});
