import { describe, expect, it } from "vitest";

import { distributePastedWords } from "./distribute-pasted-words";

/**
 * 测试用的 6 个空输入框.
 */
const EMPTY = ["", "", "", "", "", ""];

describe("distributePastedWords", () => {
  it("只有一个词时不处理, 交给输入框自己的粘贴", () => {
    expect(distributePastedWords(EMPTY, 2, "abandon")).toBeUndefined();
    expect(distributePastedWords(EMPTY, 2, "  \n ")).toBeUndefined();
  });

  it("词数不少于输入框个数时从第一个框开始填满", () => {
    const text = "one two three four five six";

    expect(distributePastedWords(EMPTY, 3, text)).toEqual([
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
    ]);
  });

  it("词数多于输入框个数时多出的词丢弃", () => {
    expect(distributePastedWords(EMPTY, 3, "a b c d e f g h")).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
    ]);
  });
});

describe("distributePastedWords 从当前框往后填", () => {
  it("词数少于输入框个数时从当前框往后填, 之前的框保持不变", () => {
    const current = ["keep", "", "", "", "", ""];

    expect(distributePastedWords(current, 2, "x y z")).toEqual([
      "keep",
      "",
      "x",
      "y",
      "z",
      "",
    ]);
  });

  it("接近末尾时超出的词丢弃, 按空白与换行切词并转小写", () => {
    expect(distributePastedWords(EMPTY, 4, "One\nTWO\tThree")).toEqual([
      "",
      "",
      "",
      "",
      "one",
      "two",
    ]);
  });

  it("不改动传入的数组", () => {
    const current = [...EMPTY];

    distributePastedWords(current, 0, "a b");

    expect(current).toEqual(EMPTY);
  });
});
