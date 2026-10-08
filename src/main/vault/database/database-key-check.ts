import { hasDatabaseContent } from "./database-presence";
import {
  DatabaseKeyRejectedError,
  openEncryptedDatabase,
} from "./open-encrypted-database";

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
