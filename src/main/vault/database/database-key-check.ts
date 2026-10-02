import { stat } from "node:fs/promises";

import { isFileMissingError } from "../file-exists";
import {
  DatabaseKeyRejectedError,
  openEncryptedDatabase,
} from "./open-encrypted-database";

/**
 * 判断数据库文件是否存在且有内容. 不存在或为空的文件会被 SQLCipher 当成新数据库, 接受任何
 * 数据密钥, 所以必须先排除.
 * @param databaseFile 数据库文件路径.
 * @returns 文件存在且不是空文件时兑现为 true.
 * @throws Error 当访问文件失败且原因不是文件不存在时.
 */
async function hasDatabaseContent(databaseFile: string): Promise<boolean> {
  try {
    return (await stat(databaseFile)).size > 0;
  } catch (error) {
    if (isFileMissingError(error)) {
      return false;
    }
    throw error;
  }
}

/**
 * 判断已有的加密数据库能否被给定的数据密钥打开. 只读一次系统表就关闭, 不执行迁移, 不改动文件.
 * @param databaseFile 数据库文件路径.
 * @param dataKey 32 字节的数据密钥.
 * @returns 数据库存在, 有内容且接受该密钥时兑现为 true.
 * @throws Error 当访问文件失败, 或打开数据库时发生密钥被拒绝以外的错误时.
 */
export async function doesDatabaseAcceptKey(
  databaseFile: string,
  dataKey: Buffer,
): Promise<boolean> {
  if (!(await hasDatabaseContent(databaseFile))) {
    return false;
  }
  try {
    openEncryptedDatabase(databaseFile, dataKey).close();
    return true;
  } catch (error) {
    if (error instanceof DatabaseKeyRejectedError) {
      return false;
    }
    throw error;
  }
}
