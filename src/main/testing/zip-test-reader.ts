import { crc32, inflateRawSync } from "node:zlib";

/**
 * 中央目录结束记录的签名.
 */
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;

/**
 * 中央目录文件头的签名.
 */
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;

/**
 * 本地文件头的签名.
 */
const LOCAL_HEADER_SIGNATURE = 0x04034b50;

/**
 * 压缩方法: 仅存储.
 */
const METHOD_STORED = 0;

/**
 * 压缩方法: deflate.
 */
const METHOD_DEFLATE = 8;

/**
 * 从压缩包里读出的一个文件.
 */
export interface ZipTestEntry {
  /**
   * 文件在压缩包里的路径.
   */
  readonly name: string;
  /**
   * 解压后的内容, 已核对 crc32.
   */
  readonly content: Buffer;
  /**
   * 压缩方法: 0 是仅存储, 8 是 deflate.
   */
  readonly method: number;
}

/**
 * 在压缩包末尾找中央目录结束记录的位置.
 * @param zip 压缩包字节.
 * @returns 记录的起始偏移.
 * @throws Error 当找不到记录时.
 */
function findEndRecord(zip: Buffer): number {
  for (let offset = zip.length - 22; offset >= 0; offset -= 1) {
    if (zip.readUInt32LE(offset) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      return offset;
    }
  }
  throw new Error("不是合法的压缩包: 找不到中央目录结束记录");
}

/**
 * 按中央目录里的信息读出一个文件的内容并核对 crc32.
 * @param zip 压缩包字节.
 * @param header 中央目录文件头的起始偏移.
 * @returns 文件路径, 内容与压缩方法.
 * @throws Error 当本地文件头损坏, 压缩方法不支持或 crc32 不符时.
 */
function readEntryAt(zip: Buffer, header: number): ZipTestEntry {
  if (zip.readUInt32LE(header) !== CENTRAL_DIRECTORY_SIGNATURE) {
    throw new Error("中央目录文件头损坏");
  }
  const method = zip.readUInt16LE(header + 10);
  const expectedCrc = zip.readUInt32LE(header + 16);
  const compressedSize = zip.readUInt32LE(header + 20);
  const nameLength = zip.readUInt16LE(header + 28);
  const localOffset = zip.readUInt32LE(header + 42);
  const name = zip.toString("utf8", header + 46, header + 46 + nameLength);
  if (zip.readUInt32LE(localOffset) !== LOCAL_HEADER_SIGNATURE) {
    throw new Error("本地文件头损坏");
  }
  const dataStart =
    localOffset +
    30 +
    zip.readUInt16LE(localOffset + 26) +
    zip.readUInt16LE(localOffset + 28);
  const raw = zip.subarray(dataStart, dataStart + compressedSize);
  if (method !== METHOD_STORED && method !== METHOD_DEFLATE) {
    throw new Error("不支持的压缩方法");
  }
  const content =
    method === METHOD_STORED ? Buffer.from(raw) : inflateRawSync(raw);
  if (crc32(content) !== expectedCrc) {
    throw new Error("crc32 不符");
  }
  return { name, content, method };
}

/**
 * 读出压缩包里全部文件, 按中央目录里的先后顺序. 只支持测试里 yazl 写出的普通压缩包 (不含 zip64),
 * 这是测试支撑, 不属于应用代码.
 * @param zip 压缩包字节.
 * @returns 全部文件.
 */
export function readZipEntries(zip: Buffer): ZipTestEntry[] {
  const end = findEndRecord(zip);
  const count = zip.readUInt16LE(end + 10);
  let header = zip.readUInt32LE(end + 16);
  const entries: ZipTestEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    entries.push(readEntryAt(zip, header));
    const nameLength = zip.readUInt16LE(header + 28);
    const extraLength = zip.readUInt16LE(header + 30);
    const commentLength = zip.readUInt16LE(header + 32);
    header += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}
