import { createDecipheriv } from "node:crypto";
import { readFileSync } from "node:fs";

/**
 * SQLCipher 4 数据库的页大小, 字节.
 */
const PAGE_SIZE_BYTES = 4096;

/**
 * 第一页开头的明文盐的字节数, 它不参与加密.
 */
const SALT_BYTES = 16;

/**
 * 每页末尾的初始向量字节数.
 */
const INITIALIZATION_VECTOR_BYTES = 16;

/**
 * 每页末尾的消息认证码字节数 (HMAC-SHA512).
 */
const MESSAGE_AUTHENTICATION_CODE_BYTES = 64;

/**
 * 每页末尾保留的字节数: 初始向量加消息认证码.
 */
const RESERVED_BYTES =
  INITIALIZATION_VECTOR_BYTES + MESSAGE_AUTHENTICATION_CODE_BYTES;

/**
 * 页内容使用的加密算法, 密钥是 32 字节的原始数据密钥.
 */
const PAGE_CIPHER = "aes-256-cbc";

/**
 * 逐页解密一个 SQLCipher 4 数据库文件, 返回全部页的明文拼接. 与 SQLite 自带的重加密不同, 它
 * 不整理空闲页, 所以被删记录残留在空闲页里的明文也会原样保留, 用来核对删除后有没有残留.
 * @param databaseFile 数据库文件路径.
 * @param dataKey 32 字节的原始数据密钥.
 * @returns 全部页的明文, 不含盐, 初始向量与消息认证码.
 */
export function decryptDatabasePages(
  databaseFile: string,
  dataKey: Buffer,
): Buffer {
  const encrypted = readFileSync(databaseFile);
  const pages: Buffer[] = [];
  for (let offset = 0; offset < encrypted.length; offset += PAGE_SIZE_BYTES) {
    const page = encrypted.subarray(offset, offset + PAGE_SIZE_BYTES);
    const bodyStart = offset === 0 ? SALT_BYTES : 0;
    const vectorStart = PAGE_SIZE_BYTES - RESERVED_BYTES;
    const decipher = createDecipheriv(
      PAGE_CIPHER,
      dataKey,
      page.subarray(vectorStart, vectorStart + INITIALIZATION_VECTOR_BYTES),
    );
    decipher.setAutoPadding(false);
    pages.push(
      Buffer.concat([
        decipher.update(page.subarray(bodyStart, vectorStart)),
        decipher.final(),
      ]),
    );
  }
  return Buffer.concat(pages);
}
