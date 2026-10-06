import type { Readable } from "node:stream";

import { Decrypter } from "age-encryption";

import { iterateWebStream, toWebStream } from "../export/web-stream-adapters";
import {
  BackupDamagedError,
  RestoreLimitExceededError,
  WrongPassphraseError,
} from "./restore-errors";

/**
 * age-encryption 在口令 (或密钥) 解不开任何接收方时抛出的错误信息. 口令不对时就是这一条,
 * 测试用真实的加密文件锁定它, 升级库之后信息变了测试会失败.
 */
export const NO_MATCHING_IDENTITY_MESSAGE =
  "no identity matched any of the file's recipients";

/**
 * 把解密开头抛出的错误换成恢复的错误: 口令不对是错口令, 其它都是文件损坏.
 * @param error 解密抛出的错误.
 * @returns 恢复的错误.
 */
function toDecryptionError(error: unknown): Error {
  return error instanceof Error &&
    error.message === NO_MATCHING_IDENTITY_MESSAGE
    ? new WrongPassphraseError()
    : new BackupDamagedError(error);
}

/**
 * 把解密后的字节流整体读进内存, 累计字节数超过上限就中止.
 * @param plaintext 解密后的 Web 流.
 * @param maxBytes 允许的最大字节数.
 * @returns 全部明文字节.
 * @throws RestoreLimitExceededError 当明文超过上限时.
 * @throws BackupDamagedError 当载荷校验失败或读取出错时.
 */
async function collectPlaintext(
  plaintext: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    for await (const chunk of iterateWebStream(plaintext)) {
      total += chunk.byteLength;
      if (total > maxBytes) {
        throw new RestoreLimitExceededError("archive", "too-large");
      }
      chunks.push(
        Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength),
      );
    }
  } catch (error) {
    if (error instanceof RestoreLimitExceededError) {
      throw error;
    }
    throw new BackupDamagedError(error);
  }
  return Buffer.concat(chunks, total);
}

/**
 * 用口令解开 age 加密的备份, 整个解密在内存里完成, 不产生明文临时文件. 口令只经本次调用传入,
 * 不保存. 口令派生是同步的 scrypt 计算, 解密方只接受不超过 20 的工作因子.
 * @param source 加密备份文件的可读流, 解密结束或失败后都会被销毁.
 * @param passphrase 加密口令.
 * @param maxBytes 解密后允许的最大字节数.
 * @returns 解密得到的压缩包字节.
 * @throws WrongPassphraseError 当口令不对时.
 * @throws BackupDamagedError 当文件不是合法的加密文件, 或内容已损坏时.
 * @throws RestoreLimitExceededError 当解密后的字节超过上限时.
 */
export async function decryptBackup(
  source: Readable,
  passphrase: string,
  maxBytes: number,
): Promise<Buffer> {
  const decrypter = new Decrypter();
  decrypter.addPassphrase(passphrase);
  try {
    const plaintext = await decrypter
      .decrypt(toWebStream(source))
      .catch((error: unknown) => {
        throw toDecryptionError(error);
      });
    return await collectPlaintext(plaintext, maxBytes);
  } finally {
    source.destroy();
  }
}
