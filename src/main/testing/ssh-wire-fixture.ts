/**
 * 测试里手工拼数据块时每个字段前面长度前缀的字节数, 与实现各写一份, 让测试独立于实现.
 */
const LENGTH_PREFIX_BYTES = 4;

/**
 * 把字段按 SSH 的长度前缀格式拼成字节: 每个字段是 4 字节大端长度加内容.
 * @param fields 依次排列的字段内容.
 * @returns 拼好的字节.
 */
export function encodeSshWireFields(fields: readonly Buffer[]): Buffer {
  return Buffer.concat(
    fields.flatMap((field) => {
      const prefix = Buffer.alloc(LENGTH_PREFIX_BYTES);
      prefix.writeUInt32BE(field.length);
      return [prefix, field];
    }),
  );
}

/**
 * 把文本按 ASCII 转成字节, 测试里拼算法名与字段内容用.
 * @param text 文本.
 * @returns 字节.
 */
export function asciiBytes(text: string): Buffer {
  return Buffer.from(text, "ascii");
}
