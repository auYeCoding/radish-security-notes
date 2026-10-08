import { stat } from "node:fs/promises";

import { isFileMissingError } from "../file-exists";

/**
 * 判断数据库文件是否存在且有内容. 不存在或为空的文件会被 SQLCipher 当成新数据库, 接受任何
 * 数据密钥, 所以必须先排除.
 * @param databaseFile 数据库文件路径.
 * @returns 文件存在且不是空文件时兑现为 true.
 * @throws Error 当访问文件失败且原因不是文件不存在时.
 */
export async function hasDatabaseContent(
  databaseFile: string,
): Promise<boolean> {
  try {
    return (await stat(databaseFile)).size > 0;
  } catch (error) {
    if (isFileMissingError(error)) {
      return false;
    }
    throw error;
  }
}
