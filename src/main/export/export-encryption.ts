import { Readable } from "node:stream";

import { Encrypter } from "age-encryption";

/**
 * 口令派生的 scrypt 工作因子, 取 age-encryption 的默认值 18: N 为 2 的 18 次方, 约 256 MiB 内存.
 * 解密方 (age 命令行与 age-encryption) 都接受不超过 20 的工作因子.
 */
export const EXPORT_SCRYPT_WORK_FACTOR = 18;

/**
 * 把 Node 的可读流包成 Web 流, age-encryption 的流式加密只接受 Web 流. 按需拉取, 源流出错时
 * Web 流以同一个错误结束, 下游取消时销毁源流.
 * @param source Node 可读流.
 * @returns Web 流.
 */
function toWebStream(source: Readable): ReadableStream<Uint8Array> {
  const iterator = source[Symbol.asyncIterator]();
  return new ReadableStream<Uint8Array>({
    pull: async (controller) => {
      const { done, value } = await iterator.next();
      if (done === true) {
        controller.close();
      } else {
        controller.enqueue(new Uint8Array(value));
      }
    },
    cancel: () => {
      source.destroy();
    },
  });
}

/**
 * 把 Web 流逐块转成异步迭代, 迭代提前结束时取消 Web 流.
 * @param stream Web 流.
 * @yields 流里的字节块.
 */
async function* iterateWebStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<Uint8Array> {
  const reader = stream.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      yield value;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

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
