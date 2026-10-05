import {
  importFailed,
  importSucceeded,
  type ImportResult,
} from "@shared/import/import-result";
import { MAX_IMPORT_FILE_BYTES } from "@shared/import/import-limits";

import type { ImportFilePort } from "./import-ports";

/**
 * 读取来源文件的依赖.
 */
export interface ImportFileReaderDependencies {
  /**
   * 文件系统能力.
   */
  readonly file: ImportFilePort;
  /**
   * 文件系统操作意外失败时的回调, 参数是底层错误.
   */
  readonly onFailure: (error: unknown) => void;
}

/**
 * UTF-16 小端字节序标记的两个字节.
 */
const UTF16_LITTLE_ENDIAN_MARK = [0xff, 0xfe] as const;

/**
 * UTF-16 大端字节序标记的两个字节.
 */
const UTF16_BIG_ENDIAN_MARK = [0xfe, 0xff] as const;

/**
 * 文本里出现空字符说明文件不是 UTF-8 文本, 例如没有字节序标记的 UTF-16.
 */
const NULL_CHARACTER = "\u0000";

/**
 * 严格的 UTF-8 解码器: 遇到非法字节时抛错, 带 UTF-8 字节序标记时去掉标记.
 */
const STRICT_UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

/**
 * 判断缓冲区是否以给定的字节开头.
 * @param buffer 缓冲区.
 * @param prefix 开头的字节.
 * @returns 以这些字节开头时返回 true.
 */
function startsWith(buffer: Buffer, prefix: readonly number[]): boolean {
  return prefix.every((byte, index) => buffer[index] === byte);
}

/**
 * 把来源文件的字节严格按 UTF-8 解码成文本.
 * @param bytes 文件的全部字节.
 * @returns 文本, 不是 UTF-8 (UTF-16, 非法字节, 含空字符) 时为 undefined.
 */
function decodeUtf8(bytes: Buffer): string | undefined {
  if (
    startsWith(bytes, UTF16_LITTLE_ENDIAN_MARK) ||
    startsWith(bytes, UTF16_BIG_ENDIAN_MARK)
  ) {
    return undefined;
  }
  try {
    const text = STRICT_UTF8_DECODER.decode(bytes);
    return text.includes(NULL_CHARACTER) ? undefined : text;
  } catch {
    return undefined;
  }
}

/**
 * 读取来源文件并解码成文本: 先用文件状态拦下目录, 空文件与超过大小上限的文件, 再读入字节,
 * 严格按 UTF-8 解码 (带 BOM 照常), 解码之后立即把字节缓冲区清零. 失败只把错误名交给回调,
 * 路径与文件内容不进日志.
 * @param dependencies 文件系统能力与失败回调.
 * @param filePath 来源文件的路径.
 * @returns 文件文本; 读不了, 为空, 过大或不是 UTF-8 时为失败结果.
 */
export async function readImportText(
  dependencies: ImportFileReaderDependencies,
  filePath: string,
): Promise<ImportResult<string>> {
  const { file, onFailure } = dependencies;
  try {
    const facts = await file.statFile(filePath);
    if (!facts.isFile) {
      return importFailed("file-unreadable");
    }
    if (facts.size === 0) {
      return importFailed("file-empty");
    }
    if (facts.size > MAX_IMPORT_FILE_BYTES) {
      return importFailed("file-too-large");
    }
    const bytes = await file.readFile(filePath);
    const text = decodeUtf8(bytes);
    bytes.fill(0);
    return text === undefined
      ? importFailed("encoding-unsupported")
      : importSucceeded(text);
  } catch (error) {
    onFailure(error);
    return importFailed("file-unreadable");
  }
}
