import { mkdir, open, readFile, rename } from "node:fs/promises";

import { isFileMissingError } from "./file-exists";
import {
  InvalidKeyRecordError,
  parseKeyRecord,
  type KeyRecord,
} from "./key-record";
import type { VaultPaths } from "./vault-paths";

/**
 * 写密钥文件时先写入的临时文件的后缀, 写完后改名覆盖正式文件.
 */
const TEMPORARY_FILE_SUFFIX = ".tmp";

/**
 * 密钥文件的读写: 读时校验结构, 写时先写临时文件再改名, 崩溃不会留下写了一半的文件.
 */
export class KeyFileStore {
  /**
   * 创建密钥文件存储.
   * @param paths 保险库路径.
   */
  constructor(private readonly paths: VaultPaths) {}

  /**
   * 读取密钥文件.
   * @returns 密钥文件内容, 文件不存在时为 undefined.
   * @throws InvalidKeyRecordError 当文件内容不是合法的密钥文件时.
   */
  async read(): Promise<KeyRecord | undefined> {
    let text: string;
    try {
      text = await readFile(this.paths.keyFile, "utf8");
    } catch (error) {
      if (isFileMissingError(error)) {
        return undefined;
      }
      throw error;
    }
    return parseKeyRecord(this.parseJson(text));
  }

  /**
   * 写入密钥文件, 目录不存在时先创建.
   * @param record 要写入的密钥文件内容.
   * @returns 写入完成后兑现.
   */
  async write(record: KeyRecord): Promise<void> {
    await mkdir(this.paths.directory, { recursive: true });
    const temporaryFile = `${this.paths.keyFile}${TEMPORARY_FILE_SUFFIX}`;
    const handle = await open(temporaryFile, "w");
    try {
      await handle.writeFile(JSON.stringify(record, undefined, 2), "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporaryFile, this.paths.keyFile);
  }

  /**
   * 解析 JSON 文本, 失败时转成密钥文件不合法的错误.
   * @param text 文件文本.
   * @returns 解析出的值.
   */
  private parseJson(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new InvalidKeyRecordError("密钥文件不是合法的 JSON", {
        cause: error,
      });
    }
  }
}
