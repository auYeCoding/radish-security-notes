import { describe, expect, it } from "vitest";

import { readableOfText } from "./text-stream";

/**
 * 逐片段生成文本.
 * @yields 两个文本片段.
 */
async function* twoChunks(): AsyncGenerator<string> {
  yield "中文";
  yield "abc";
}

describe("文本片段转字节流", () => {
  it("读到的每一块都是 Buffer, 不是字符串, 内容是 UTF-8", async () => {
    const chunks: unknown[] = [];
    for await (const chunk of readableOfText(twoChunks())) {
      chunks.push(chunk);
    }
    expect(chunks.every((chunk) => Buffer.isBuffer(chunk))).toBe(true);
    expect(Buffer.concat(chunks as Buffer[]).toString("utf8")).toBe("中文abc");
  });

  it("迭代出错时流以同一个错误结束", async () => {
    async function* failing(): AsyncGenerator<string> {
      yield "x";
      throw new Error("生成失败");
    }
    const stream = readableOfText(failing());
    await expect(
      (async () => {
        for await (const chunk of stream) {
          void chunk;
        }
      })(),
    ).rejects.toThrow("生成失败");
  });
});
