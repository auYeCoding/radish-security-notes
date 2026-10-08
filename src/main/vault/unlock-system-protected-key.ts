import type { KeyFileStore } from "./key-file-store";
import type { SystemKeyRecord } from "./key-record";
import type { SafeStoragePort } from "./safe-storage-port";
import { unprotectWithSystem } from "./system-key-protector";

/**
 * 解开系统保护的数据密钥: 系统要求重新加密时先把新记录改写进密钥文件. 改写失败时清零内存里的
 * 数据密钥再抛出, 调用方拿不到也留不下一份没有用完的密钥.
 * @param record 密钥文件中的系统保护记录.
 * @param safeStorage 系统保护数据密钥用的 safeStorage 接口.
 * @param keyFileStore 密钥文件存储.
 * @returns 数据密钥, 调用方用完后必须清零.
 * @throws Error 当系统解密失败, 解出的内容不是数据密钥, 或改写密钥文件失败时.
 */
export async function unlockSystemProtectedKey(
  record: SystemKeyRecord,
  safeStorage: SafeStoragePort,
  keyFileStore: KeyFileStore,
): Promise<Buffer> {
  const { dataKey, refreshedRecord } = await unprotectWithSystem(
    record,
    safeStorage,
  );
  try {
    if (refreshedRecord !== undefined) {
      await keyFileStore.write(refreshedRecord);
    }
  } catch (error) {
    dataKey.fill(0);
    throw error;
  }
  return dataKey;
}
