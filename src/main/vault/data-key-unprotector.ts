import { KeyUnwrapError } from "./aes-gcm-key-wrapper";
import {
  MASTER_PASSWORD_PROTECTION,
  type KeyRecord,
  type MasterPasswordKeyRecord,
} from "./key-record";
import { unprotectWithMasterPassword } from "./master-password-key-protector";
import type { SafeStoragePort } from "./safe-storage-port";
import { unprotectWithSystem } from "./system-key-protector";

/**
 * 数据密钥已解出的结果.
 */
export interface DataKeyUnprotected {
  /**
   * 结果的种类, 解出时恒为 "unprotected".
   */
  readonly outcome: "unprotected";
  /**
   * 解出的数据密钥, 调用方用完后必须清零.
   */
  readonly dataKey: Buffer;
}

/**
 * 密钥文件由主密码保护, 但调用方没有给出主密码的结果.
 */
export interface DataKeyPasswordRequired {
  /**
   * 结果的种类, 需要主密码时恒为 "password-required".
   */
  readonly outcome: "password-required";
}

/**
 * 给出的主密码不对的结果.
 */
export interface DataKeyWrongPassword {
  /**
   * 结果的种类, 主密码不对时恒为 "wrong-password".
   */
  readonly outcome: "wrong-password";
}

/**
 * 按保护方式解出数据密钥的结果: 已解出, 需要主密码, 或主密码不对.
 */
export type DataKeyUnprotection =
  DataKeyUnprotected | DataKeyPasswordRequired | DataKeyWrongPassword;

/**
 * 用主密码解开数据密钥, 主密码不对时返回对应结果而不是抛错.
 * @param record 密钥文件中的主密码保护记录.
 * @param masterPassword 用户输入的主密码.
 * @returns 已解出或主密码不对.
 * @throws Error 当解开失败的原因不是主密码不对时.
 */
export async function unprotectWithPassword(
  record: MasterPasswordKeyRecord,
  masterPassword: string,
): Promise<DataKeyUnprotected | DataKeyWrongPassword> {
  try {
    const dataKey = await unprotectWithMasterPassword(record, masterPassword);
    return { outcome: "unprotected", dataKey };
  } catch (error) {
    if (error instanceof KeyUnwrapError) {
      return { outcome: "wrong-password" };
    }
    throw error;
  }
}

/**
 * 按密钥文件的保护方式解出数据密钥: 主密码保护时用给出的主密码, 系统保护时交给系统并忽略
 * 主密码. 只读不写, 系统要求重新加密时给出的新记录不落盘, 所以不改动任何文件.
 * @param record 密钥文件内容.
 * @param masterPassword 用户输入的主密码, 系统保护时可以没有.
 * @param safeStorage 系统保护数据密钥用的 safeStorage 接口.
 * @returns 解出的数据密钥, 或没解出的原因.
 * @throws Error 当系统解密失败或解出的内容不是数据密钥时.
 */
export async function unprotectDataKey(
  record: KeyRecord,
  masterPassword: string | undefined,
  safeStorage: SafeStoragePort,
): Promise<DataKeyUnprotection> {
  if (record.protection !== MASTER_PASSWORD_PROTECTION) {
    const { dataKey } = await unprotectWithSystem(record, safeStorage);
    return { outcome: "unprotected", dataKey };
  }
  if (masterPassword === undefined) {
    return { outcome: "password-required" };
  }
  return unprotectWithPassword(record, masterPassword);
}
