import {
  vaultOperationFailed,
  type VaultOperationFailure,
} from "@shared/vault/vault-operation-result";

import { doesDatabaseAcceptKey } from "./database/database-key-check";
import {
  RecoveryChecksumError,
  RecoveryUnknownWordError,
  RecoveryWordCountError,
  recoveryWordsToDataKey,
} from "./recovery-phrase";

/**
 * 凭恢复词找回数据密钥成功的结果.
 */
export interface DataKeyRecoverySuccess {
  /**
   * 操作是否成功, 成功时恒为 true.
   */
  readonly ok: true;
  /**
   * 已确认能打开数据库的数据密钥, 调用方用完后必须清零.
   */
  readonly dataKey: Buffer;
}

/**
 * 凭恢复词找回数据密钥的结果: 成功, 或带原因的失败.
 */
export type DataKeyRecovery = DataKeyRecoverySuccess | VaultOperationFailure;

/**
 * 把恢复词的解码错误换成失败结果, 其它错误原样抛出.
 * @param error 解码时抛出的错误.
 * @returns 对应的失败结果.
 * @throws Error 当错误不是恢复词的解码错误时.
 */
function describeDecodeError(error: unknown): VaultOperationFailure {
  if (error instanceof RecoveryWordCountError) {
    return vaultOperationFailed("recovery-word-count");
  }
  if (error instanceof RecoveryUnknownWordError) {
    return vaultOperationFailed("recovery-unknown-word", error.position);
  }
  if (error instanceof RecoveryChecksumError) {
    return vaultOperationFailed("recovery-checksum");
  }
  throw error;
}

/**
 * 凭恢复词找回数据密钥: 依次检查词数, 词表, 校验和, 再确认数据库能被它打开. 不改动任何文件.
 * @param words 用户输入的恢复词.
 * @param databaseFile 现有的加密数据库文件.
 * @returns 成功时带数据密钥, 否则带失败原因.
 */
export async function recoverDataKey(
  words: readonly string[],
  databaseFile: string,
): Promise<DataKeyRecovery> {
  let dataKey: Buffer;
  try {
    dataKey = recoveryWordsToDataKey(words);
  } catch (error) {
    return describeDecodeError(error);
  }
  let isAccepted = false;
  try {
    isAccepted = await doesDatabaseAcceptKey(databaseFile, dataKey);
  } finally {
    if (!isAccepted) {
      dataKey.fill(0);
    }
  }
  return isAccepted
    ? { ok: true, dataKey }
    : vaultOperationFailed("recovery-key-rejected");
}
