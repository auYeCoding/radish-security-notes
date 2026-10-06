import type { Readable } from "node:stream";

/**
 * 把 Node 的可读流包成 Web 流, age-encryption 的流式加密与解密只接受 Web 流. 按需拉取, 源流出错时
 * Web 流以同一个错误结束, 下游取消时销毁源流.
 * @param source Node 可读流.
 * @returns Web 流.
 */
export function toWebStream(source: Readable): ReadableStream<Uint8Array> {
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
export async function* iterateWebStream(
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
