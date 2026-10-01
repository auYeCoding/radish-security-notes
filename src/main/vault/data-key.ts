import { randomBytes } from "node:crypto";

/**
 * 数据密钥的字节数, 即 256 位.
 */
export const DATA_KEY_BYTES = 32;

/**
 * 生成随机的数据密钥, 它是加密整个数据库的唯一密钥.
 * @returns 随机的数据密钥.
 */
export function generateDataKey(): Buffer {
  return randomBytes(DATA_KEY_BYTES);
}

/**
 * 把数据密钥转成十六进制文本.
 * @param dataKey 数据密钥.
 * @returns 十六进制文本.
 */
export function dataKeyToHexadecimal(dataKey: Buffer): string {
  return dataKey.toString("hex");
}

/**
 * 把十六进制文本还原成数据密钥.
 * @param hexadecimal 十六进制文本.
 * @returns 数据密钥.
 * @throws Error 当文本不是 32 字节的十六进制时.
 */
export function dataKeyFromHexadecimal(hexadecimal: string): Buffer {
  const dataKey = Buffer.from(hexadecimal, "hex");
  if (
    dataKey.length !== DATA_KEY_BYTES ||
    dataKeyToHexadecimal(dataKey) !== hexadecimal.toLowerCase()
  ) {
    throw new Error("数据密钥的格式不合法");
  }
  return dataKey;
}
