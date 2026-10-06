import { Readable } from "node:stream";

import { Encrypter } from "age-encryption";

import { iterateWebStream, toWebStream } from "./web-stream-adapters";

/**
 * 口令派生的 scrypt 工作因子, 取 age-encryption 的默认值 18: N 为 2 的 18 次方, 约 256 MiB 内存.
 * 解密方 (age 命令行与 age-encryption) 都接受不超过 20 的工作因子.
 */
export const EXPORT_SCRYPT_WORK_FACTOR = 18;

/**
 * 用口令加密一个字节流, 输出 age 格式 (age-encryption.org/v1) 的字节流. 口令不做规范化, 与 age
 * 命令行互通. 口令派生是纯 JS 的 scrypt, 开始加密时会同步计算一次, 约占用主线程半秒.
 * @param source 要加密的字节流.
 * @param passphrase 加密口令.
 * @returns 加密后的字节流, 源流出错时它以同一个错误结束.
 */
export async function encryptExportStream(
  source: Readable,
  passphrase: string,
): Promise<Readable> {
  const encrypter = new Encrypter();
  encrypter.setPassphrase(passphrase);
  encrypter.setScryptWorkFactor(EXPORT_SCRYPT_WORK_FACTOR);
  const sealed = await encrypter.encrypt(toWebStream(source));
  return Readable.from(iterateWebStream(sealed));
}
