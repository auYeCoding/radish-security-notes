import {
  fromBufferPromise,
  openPromise,
  type Options,
  type ZipFile,
} from "yauzl";

import { BackupDamagedError } from "./restore-errors";

/**
 * 磁盘上的备份压缩包.
 */
export interface PathArchiveSource {
  /**
   * 来源种类, 磁盘文件时恒为 path.
   */
  readonly kind: "path";
  /**
   * 压缩包文件的路径.
   */
  readonly path: string;
}

/**
 * 已经解密到内存里的备份压缩包.
 */
export interface BytesArchiveSource {
  /**
   * 来源种类, 内存字节时恒为 bytes.
   */
  readonly kind: "bytes";
  /**
   * 压缩包的全部字节.
   */
  readonly bytes: Buffer;
}

/**
 * 备份压缩包的来源: 磁盘上的文件, 或已经解密到内存里的字节.
 */
export type BackupArchiveSource = PathArchiveSource | BytesArchiveSource;

/**
 * 打开压缩包的选项: 文件名不解码, 由调用方按白名单自行判断; 校验每个文件实际字节数与声明一致,
 * 不自动关闭, 因为要先列出全部文件再逐个读取, 由调用方在读完后关闭.
 */
const ARCHIVE_OPTIONS: Options = {
  autoClose: false,
  decodeStrings: false,
  validateEntrySizes: true,
};

/**
 * 打开备份压缩包. 磁盘上的文件按需随机读取, 不整体进内存; 内存里的字节直接读取.
 * @param source 压缩包的来源.
 * @returns 已打开的压缩包, 调用方读完后必须关闭.
 * @throws BackupDamagedError 当文件不是合法的压缩包时.
 */
export async function openBackupArchive(
  source: BackupArchiveSource,
): Promise<ZipFile> {
  try {
    return source.kind === "path"
      ? await openPromise(source.path, ARCHIVE_OPTIONS)
      : await fromBufferPromise(source.bytes, ARCHIVE_OPTIONS);
  } catch (error) {
    throw new BackupDamagedError(error);
  }
}
