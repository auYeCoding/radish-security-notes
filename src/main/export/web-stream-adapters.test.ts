import { Readable } from "node:stream";

import { describe, expect, it } from "vitest";

import { iterateWebStream, toWebStream } from "./web-stream-adapters";

/**
 * 把异步迭代读成数组.
 * @param iterable 异步迭代.
 * @returns 全部元素.
 */
async function collect<Item>(iterable: AsyncIterable<Item>): Promise<Item[]> {
  const items: Item[] = [];
  for await (const item of iterable) {
    items.push(item);
  }
  return items;
}

describe("流适配", () => {
  it("Node 可读流包成 Web 流后逐块读出原来的字节", async () => {
    const stream = toWebStream(
      Readable.from([Buffer.from("ab"), Buffer.from("c")]),
    );

    const chunks = await collect(iterateWebStream(stream));

    expect(chunks.map((chunk) => Buffer.from(chunk).toString())).toEqual([
      "ab",
      "c",
    ]);
  });

  it("源流出错时 Web 流以同一个错误结束", async () => {
    const failure = new Error("source failed");
    const source = new Readable({
      read() {
        this.destroy(failure);
      },
    });

    await expect(collect(iterateWebStream(toWebStream(source)))).rejects.toBe(
      failure,
    );
  });

  it("迭代提前结束时取消 Web 流, 销毁源流", async () => {
    const source = Readable.from([Buffer.from("a"), Buffer.from("b")]);

    for await (const chunk of iterateWebStream(toWebStream(source))) {
      expect(chunk.byteLength).toBe(1);
      break;
    }

    expect(source.destroyed).toBe(true);
  });
});
