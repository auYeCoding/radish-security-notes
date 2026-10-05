import { Readable } from "node:stream";

/**
 * 把文本片段的异步迭代包成字节流. `Readable.from` 默认是对象模式, 字符串片段会原样流出, 下游
 * 按字节处理的环节 (口令加密) 会把字符串当成空数据丢掉; 这里明确用字节模式, 片段按 UTF-8 转成
 * 字节, 读到的每一块都是 Buffer.
 * @param chunks 文本片段, 依次拼接就是完整的文本.
 * @returns 按需拉取的字节流, 迭代出错时流以同一个错误结束.
 */
export function readableOfText(chunks: AsyncIterable<string>): Readable {
  return Readable.from(chunks, { objectMode: false });
}
