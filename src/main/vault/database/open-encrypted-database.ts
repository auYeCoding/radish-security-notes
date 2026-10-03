import Database from "better-sqlite3-multiple-ciphers";

import { dataKeyToHexadecimal } from "../data-key";

/**
 * 整库加密使用的方式. SQLCipher 4 格式被 DB Browser for SQLite 等通用工具支持, 备份在
 * 没有本应用时仍可用数据密钥读取.
 */
const SQLCIPHER_CIPHER_NAME = "sqlcipher";

/**
 * 临时数据 (大排序, 索引构建) 的存放位置. SQLite 默认把溢出的临时数据以明文写进系统临时目录,
 * 加密只覆盖数据库文件本身, 所以改为只放内存.
 */
const TEMPORARY_STORE_MEMORY = "MEMORY";

/**
 * 删除时覆写被删内容的开关. SQLite 默认只把被删记录所在的页标记为空闲, 内容 (仍是密文) 留在
 * 文件里直到被新数据覆盖, 持有数据密钥的人可从空闲页读回; 打开后删除的内容会在页内写成零.
 */
const SECURE_DELETE_ON = "ON";

/**
 * 底层 SQLite 连接的类型.
 */
export type SqliteClient = Database.Database;

/**
 * 数据库拒绝了数据密钥时抛出的错误: 数据密钥不对, 或数据库文件已损坏.
 */
export class DatabaseKeyRejectedError extends Error {
  /**
   * 创建数据库拒绝数据密钥的错误.
   * @param message 错误信息.
   * @param options 错误选项, 用于保留底层原因.
   */
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DatabaseKeyRejectedError";
  }
}

/**
 * 打开整库加密的 SQLite 数据库, 文件不存在时创建. 数据密钥已是 32 字节随机数,
 * 用原始密钥写法直接交给 SQLCipher, 不再经过口令派生.
 * @param databaseFile 数据库文件路径, 所在目录必须已存在.
 * @param dataKey 32 字节的数据密钥.
 * @returns 已用数据密钥解锁的连接.
 * @throws DatabaseKeyRejectedError 当数据库拒绝该数据密钥时.
 */
export function openEncryptedDatabase(
  databaseFile: string,
  dataKey: Buffer,
): SqliteClient {
  const client = new Database(databaseFile);
  try {
    client.pragma(`cipher='${SQLCIPHER_CIPHER_NAME}'`);
    client.pragma(`key="x'${dataKeyToHexadecimal(dataKey)}'"`);
    client.pragma(`temp_store = ${TEMPORARY_STORE_MEMORY}`);
    client.pragma(`secure_delete = ${SECURE_DELETE_ON}`);
    client.prepare("select count(*) from sqlite_master").get();
    return client;
  } catch (error) {
    client.close();
    throw new DatabaseKeyRejectedError("无法用数据密钥打开加密数据库", {
      cause: error,
    });
  }
}
