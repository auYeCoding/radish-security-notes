import { randomBytes } from "node:crypto";
import { join } from "node:path";

import { openEncryptedDatabase } from "../vault/database/open-encrypted-database";
import { dataKeyToRecoveryWords } from "../vault/recovery-phrase";

/**
 * 测试用的保险库: 数据库文件与它的数据密钥编码成的恢复词.
 */
export interface SampleEncryptedVault {
  /**
   * 加密数据库文件.
   */
  readonly databaseFile: string;
  /**
   * 数据密钥编码成的 24 个恢复词.
   */
  readonly words: string[];
}

/**
 * 在目录里创建一个加密数据库, 返回它和它的恢复词.
 * @param directory 数据库所在目录.
 * @returns 测试用的保险库.
 */
export function createSampleEncryptedVault(
  directory: string,
): SampleEncryptedVault {
  const databaseFile = join(directory, "vault.db");
  const dataKey = randomBytes(32);
  const client = openEncryptedDatabase(databaseFile, dataKey);
  client.exec("create table sample (value integer)");
  client.close();
  return { databaseFile, words: dataKeyToRecoveryWords(dataKey) };
}
