/**
 * 每个字段前面长度前缀的字节数, 长度是大端的 32 位无符号整数 (RFC 4251 的 string).
 */
const LENGTH_PREFIX_BYTES = 4;

/**
 * 把字节按 SSH 的长度前缀字段切开: 每个字段是 4 字节大端长度加这么多字节的内容.
 * @param bytes 要切分的字节.
 * @returns 依次排列的字段内容; 长度前缀不完整或内容被截断时为 undefined.
 */
export function readSshWireFields(bytes: Buffer): Buffer[] | undefined {
  const fields: Buffer[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    const contentStart = offset + LENGTH_PREFIX_BYTES;
    if (contentStart > bytes.length) {
      return undefined;
    }
    const contentEnd = contentStart + bytes.readUInt32BE(offset);
    if (contentEnd > bytes.length) {
      return undefined;
    }
    fields.push(bytes.subarray(contentStart, contentEnd));
    offset = contentEnd;
  }
  return fields;
}
