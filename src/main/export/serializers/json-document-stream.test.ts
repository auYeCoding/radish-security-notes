import { describe, expect, it } from "vitest";

import { streamJsonDocument } from "./json-document-stream";

/**
 * 什么也不做的条目回调.
 * @returns 立即兑现.
 */
async function noop(): Promise<void> {
  return undefined;
}

/**
 * 把生成器产出的全部片段拼成文本.
 * @param generator 文本片段的生成器.
 * @returns 拼接后的文本.
 */
async function joinChunks(generator: AsyncGenerator<string>): Promise<string> {
  let text = "";
  for await (const chunk of generator) {
    text += chunk;
  }
  return text;
}

/**
 * 逐个生成 1, 2, 3 并记下已生成的值.
 * @param produced 记录已生成的值的数组.
 * @yields 一个数.
 */
function* trackedItems(produced: number[]): Generator<number> {
  for (const value of [1, 2, 3]) {
    produced.push(value);
    yield value;
  }
}

describe("JSON 文档逐段生成: 结构", () => {
  it("拼接后是合法的 JSON, 顶层属性在前, 数组在最后", async () => {
    const text = await joinChunks(
      streamJsonDocument(
        {
          headProperties: [
            ["encrypted", false],
            ["folders", [{ id: "f", name: "文件夹" }]],
          ],
          listName: "items",
          items: [{ n: 1 }, { n: "两\n行" }],
        },
        noop,
      ),
    );
    expect(JSON.parse(text)).toEqual({
      encrypted: false,
      folders: [{ id: "f", name: "文件夹" }],
      items: [{ n: 1 }, { n: "两\n行" }],
    });
    expect(Object.keys(JSON.parse(text))).toEqual([
      "encrypted",
      "folders",
      "items",
    ]);
  });

  it("每个条目占一行, 数组为空时仍是合法的 JSON", async () => {
    const lines = (
      await joinChunks(
        streamJsonDocument(
          {
            headProperties: [],
            listName: "items",
            items: [{ a: 1 }, { b: 2 }],
          },
          noop,
        ),
      )
    ).split("\n");
    expect(lines).toContain('    {"a":1},');
    expect(lines).toContain('    {"b":2}');
    const empty = await joinChunks(
      streamJsonDocument(
        { headProperties: [["x", 1]], listName: "items", items: [] },
        noop,
      ),
    );
    expect(JSON.parse(empty)).toEqual({ x: 1, items: [] });
  });
});

describe("JSON 文档逐段生成: 回调与按需生成", () => {
  it("每写出一个条目调用一次回调, 条目被消费时才生成", async () => {
    const produced: number[] = [];
    const calls: number[] = [];
    const generator = streamJsonDocument(
      { headProperties: [], listName: "items", items: trackedItems(produced) },
      async () => {
        calls.push(produced.length);
      },
    );
    expect(produced).toEqual([]);
    await joinChunks(generator);
    expect(calls).toEqual([1, 2, 3]);
  });

  it("回调拒绝时生成中止, 后面的条目不再生成", async () => {
    const produced: number[] = [];
    const generator = streamJsonDocument(
      { headProperties: [], listName: "items", items: trackedItems(produced) },
      async () => {
        throw new Error("stop");
      },
    );
    await expect(joinChunks(generator)).rejects.toThrow("stop");
    expect(produced).toEqual([1]);
  });
});
