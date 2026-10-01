import { randomBytes } from "node:crypto";

import type { Argon2Parameters } from "../vault/argon2-parameters";
import type { SafeStoragePort } from "../vault/safe-storage-port";

/**
 * 测试用的 Argon2id 成本参数, 取最小值让测试快速完成.
 */
export const FAST_ARGON2_PARAMETERS: Argon2Parameters = {
  memoryCostKibibytes: 1024,
  timeCost: 1,
  parallelism: 1,
};

/**
 * 测试用的主密码.
 */
export const TEST_MASTER_PASSWORD = "correct horse battery staple";

/**
 * 假 safeStorage 的行为选项.
 */
export interface FakeSafeStorageOptions {
  /**
   * 异步加密是否可用, 默认可用.
   */
  readonly isAvailable?: boolean;
  /**
   * 解密时是否要求重新加密, 默认不要求.
   */
  readonly shouldReEncrypt?: boolean;
  /**
   * 解密时是否失败, 默认不失败.
   */
  readonly isDecryptionFailing?: boolean;
}

/**
 * 假 safeStorage: 只实现异步方法, 密文是随机数加反转后的 base64, 不含可直接读出的明文,
 * 且同一明文每次加密的密文不同, 与真实系统加密的随机性一致.
 */
export interface FakeSafeStorage extends SafeStoragePort {
  /**
   * 已经调用加密的次数.
   */
  readonly getEncryptionCount: () => number;
}

/**
 * 创建假 safeStorage.
 * @param options 行为选项.
 * @returns 假 safeStorage.
 */
export function createFakeSafeStorage(
  options: FakeSafeStorageOptions = {},
): FakeSafeStorage {
  const { isAvailable = true, shouldReEncrypt = false } = options;
  let encryptionCount = 0;
  return {
    isAsyncEncryptionAvailable: () => Promise.resolve(isAvailable),
    encryptStringAsync: (plainText) => {
      encryptionCount += 1;
      const reversed = Buffer.from(plainText, "utf8").reverse();
      const nonce = randomBytes(4).toString("hex");
      return Promise.resolve(
        Buffer.from(`${nonce}.${reversed.toString("base64")}`),
      );
    },
    decryptStringAsync: (encrypted) => {
      if (options.isDecryptionFailing === true) {
        return Promise.reject(new Error("系统解密失败"));
      }
      const payload = encrypted.toString("utf8").split(".")[1] ?? "";
      const reversed = Buffer.from(payload, "base64");
      return Promise.resolve({
        shouldReEncrypt,
        result: reversed.reverse().toString("utf8"),
      });
    },
    getEncryptionCount: () => encryptionCount,
  };
}
