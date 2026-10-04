import { describe, expect, it } from "vitest";

import { SQL_PARAMETER_CHUNK_SIZE, chunkIds } from "./batch-id-chunks";

describe("chunkIds", () => {
  it("按块大小切开, 最后一块可以不满, 顺序不变", () => {
    expect(chunkIds(["a", "b", "c", "d", "e"], 2)).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e"],
    ]);
  });

  it("编号个数正好是块大小的整数倍时没有空块, 空列表没有块", () => {
    expect(chunkIds(["a", "b", "c", "d"], 2)).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
    expect(chunkIds([], 2)).toEqual([]);
  });

  it("默认块大小是 SQL 参数块大小", () => {
    const ids = Array.from(
      { length: SQL_PARAMETER_CHUNK_SIZE + 1 },
      (_, index) => `id-${index}`,
    );

    const chunks = chunkIds(ids);

    expect(chunks.map((chunk) => chunk.length)).toEqual([
      SQL_PARAMETER_CHUNK_SIZE,
      1,
    ]);
  });
});
