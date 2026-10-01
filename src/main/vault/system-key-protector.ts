import { dataKeyFromHexadecimal, dataKeyToHexadecimal } from "./data-key";
import {
  KEY_RECORD_VERSION,
  SYSTEM_PROTECTION,
  type SystemKeyRecord,
} from "./key-record";
import type { SafeStoragePort } from "./safe-storage-port";

/**
 * 系统无法保护数据密钥时抛出的错误.
 */
export class SystemProtectionUnavailableError extends Error {
  /**
   * 创建系统保护不可用的错误.
   * @param message 错误信息.
   */
  constructor(message: string) {
    super(message);
    this.name = "SystemProtectionUnavailableError";
  }
}

/**
 * 系统解开数据密钥的结果.
 */
export interface SystemUnprotectResult {
  /**
   * 数据密钥.
   */
  readonly dataKey: Buffer;
  /**
   * 系统要求用新密钥重新加密时给出的新记录, 不需要时为 undefined.
   */
  readonly refreshedRecord: SystemKeyRecord | undefined;
}

/**
 * 用系统保护数据密钥, 只调用 safeStorage 的异步方法.
 * @param dataKey 被保护的数据密钥.
 * @param safeStorage safeStorage 接口.
 * @returns 可写入密钥文件的记录.
 * @throws SystemProtectionUnavailableError 当系统不能加密时.
 */
export async function protectWithSystem(
  dataKey: Buffer,
  safeStorage: SafeStoragePort,
): Promise<SystemKeyRecord> {
  if (!(await safeStorage.isAsyncEncryptionAvailable())) {
    throw new SystemProtectionUnavailableError("系统不能保护数据密钥");
  }
  const encrypted = await safeStorage.encryptStringAsync(
    dataKeyToHexadecimal(dataKey),
  );
  return {
    version: KEY_RECORD_VERSION,
    protection: SYSTEM_PROTECTION,
    wrappedDataKey: encrypted.toString("base64"),
  };
}

/**
 * 用系统解开被保护的数据密钥. 系统指出密文应重新加密时, 用同一个数据密钥生成新记录.
 * @param record 密钥文件中的系统保护记录.
 * @param safeStorage safeStorage 接口.
 * @returns 数据密钥, 以及可能的新记录.
 * @throws Error 当系统解密失败或解出的内容不是数据密钥时.
 */
export async function unprotectWithSystem(
  record: SystemKeyRecord,
  safeStorage: SafeStoragePort,
): Promise<SystemUnprotectResult> {
  const { shouldReEncrypt, result } = await safeStorage.decryptStringAsync(
    Buffer.from(record.wrappedDataKey, "base64"),
  );
  const dataKey = dataKeyFromHexadecimal(result);
  if (!shouldReEncrypt) {
    return { dataKey, refreshedRecord: undefined };
  }
  return {
    dataKey,
    refreshedRecord: await protectWithSystem(dataKey, safeStorage),
  };
}
