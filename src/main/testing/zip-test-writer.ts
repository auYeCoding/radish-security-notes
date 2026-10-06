import { crc32, deflateRawSync } from "node:zlib";

/**
 * 本地文件头的签名.
 */
const LOCAL_HEADER_SIGNATURE = 0x04034b50;

/**
 * 中央目录文件头的签名.
 */
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;

/**
 * 中央目录结束记录的签名.
 */
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;

/**
 * 通用标志位: 文件名按 UTF-8 编码.
 */
const FLAG_UTF8 = 0x800;

/**
 * 通用标志位: 文件加密.
 */
const FLAG_ENCRYPTED = 0x1;

/**
 * 压缩方法: 仅存储.
 */
const METHOD_STORED = 0;

/**
 * 压缩方法: deflate.
 */
const METHOD_DEFLATE = 8;

/**
 * DOS 日期 1980-01-01.
 */
const DOS_DATE = 0x21;

/**
 * 本地文件头固定部分的字节数.
 */
const LOCAL_HEADER_BYTES = 30;

/**
 * 中央目录文件头固定部分的字节数.
 */
const CENTRAL_HEADER_BYTES = 46;

/**
 * 中央目录结束记录的字节数.
 */
const END_RECORD_BYTES = 22;

/**
 * 测试里要写进压缩包的一个文件. 与 yazl 不同, 文件名不做任何检查, 可以是路径穿越, 绝对路径,
 * 重复的名称, 用来造不合规的压缩包.
 */
export interface ZipTestFile {
  /**
   * 文件在压缩包里的路径, 原样写入.
   */
  readonly name: string;
  /**
   * 文件内容.
   */
  readonly content: Buffer;
  /**
   * 压缩方法, 默认仅存储.
   */
  readonly method?: "stored" | "deflate";
  /**
   * 写进头部的未压缩字节数, 默认是内容的真实字节数, 给不同的值来造声明与实际不符的压缩包.
   */
  readonly declaredSize?: number;
  /**
   * 是否在头部标记为加密, 默认不加密.
   */
  readonly isEncrypted?: boolean;
}

/**
 * 一个文件写入后的位置与头部信息.
 */
interface WrittenFile {
  /**
   * 本地文件头在压缩包里的偏移.
   */
  readonly offset: number;
  /**
   * 文件名字节.
   */
  readonly nameBytes: Buffer;
  /**
   * 通用标志位.
   */
  readonly flags: number;
  /**
   * 压缩方法编号.
   */
  readonly method: number;
  /**
   * 内容的 crc32.
   */
  readonly checksum: number;
  /**
   * 压缩后的字节数.
   */
  readonly compressedSize: number;
  /**
   * 头部声明的未压缩字节数.
   */
  readonly uncompressedSize: number;
}

/**
 * 一个文件的本地文件头与数据的字节, 连同它的头部信息.
 */
interface LocalFileBytes {
  /**
   * 本地文件头加数据的字节.
   */
  readonly bytes: Buffer;
  /**
   * 这个文件的头部信息.
   */
  readonly written: WrittenFile;
}

/**
 * 写出一个文件的本地文件头与数据.
 * @param file 要写的文件.
 * @param offset 本地文件头的偏移.
 * @returns 头部加数据的字节, 与这个文件的头部信息.
 */
function writeLocalFile(file: ZipTestFile, offset: number): LocalFileBytes {
  const nameBytes = Buffer.from(file.name, "utf8");
  const isDeflate = file.method === "deflate";
  const data = isDeflate ? deflateRawSync(file.content) : file.content;
  const flags = FLAG_UTF8 | (file.isEncrypted === true ? FLAG_ENCRYPTED : 0);
  const method = isDeflate ? METHOD_DEFLATE : METHOD_STORED;
  const checksum = crc32(file.content);
  const uncompressedSize = file.declaredSize ?? file.content.length;
  const header = Buffer.alloc(LOCAL_HEADER_BYTES);
  header.writeUInt32LE(LOCAL_HEADER_SIGNATURE, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(flags, 6);
  header.writeUInt16LE(method, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(DOS_DATE, 12);
  header.writeUInt32LE(checksum, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(uncompressedSize, 22);
  header.writeUInt16LE(nameBytes.length, 26);
  header.writeUInt16LE(0, 28);
  return {
    bytes: Buffer.concat([header, nameBytes, data]),
    written: {
      offset,
      nameBytes,
      flags,
      method,
      checksum,
      compressedSize: data.length,
      uncompressedSize,
    },
  };
}

/**
 * 写出一个文件的中央目录文件头.
 * @param written 文件的头部信息.
 * @returns 中央目录文件头的字节.
 */
function writeCentralHeader(written: WrittenFile): Buffer {
  const header = Buffer.alloc(CENTRAL_HEADER_BYTES);
  header.writeUInt32LE(CENTRAL_DIRECTORY_SIGNATURE, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(written.flags, 8);
  header.writeUInt16LE(written.method, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(DOS_DATE, 14);
  header.writeUInt32LE(written.checksum, 16);
  header.writeUInt32LE(written.compressedSize, 20);
  header.writeUInt32LE(written.uncompressedSize, 24);
  header.writeUInt16LE(written.nameBytes.length, 28);
  header.writeUInt32LE(written.offset, 42);
  return Buffer.concat([header, written.nameBytes]);
}

/**
 * 把一批文件写成一个 ZIP 压缩包的字节, 文件名与头部声明都不做检查, 只用于造测试样本.
 * @param files 按顺序写入的文件.
 * @returns 压缩包的字节.
 */
export function writeZip(files: readonly ZipTestFile[]): Buffer {
  const parts: Buffer[] = [];
  const writtenFiles: WrittenFile[] = [];
  let offset = 0;
  for (const file of files) {
    const { bytes, written } = writeLocalFile(file, offset);
    parts.push(bytes);
    writtenFiles.push(written);
    offset += bytes.length;
  }
  const central = Buffer.concat(writtenFiles.map(writeCentralHeader));
  const end = Buffer.alloc(END_RECORD_BYTES);
  end.writeUInt32LE(END_OF_CENTRAL_DIRECTORY_SIGNATURE, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, central, end]);
}
