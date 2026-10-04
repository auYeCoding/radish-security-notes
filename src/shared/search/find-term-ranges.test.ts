import { describe, expect, it } from "vitest";

import { findTermRanges } from "./find-term-ranges";
import { foldTextWithOrigins } from "./fold-text";

describe("findTermRanges", () => {
  it("找出词的全部不重叠出现处", () => {
    const source = foldTextWithOrigins("abcabc");

    expect(findTermRanges(source, "bc")).toEqual([
      { start: 1, end: 3 },
      { start: 4, end: 6 },
    ]);
  });

  it("重叠的出现处只取先出现的", () => {
    const source = foldTextWithOrigins("aaa");

    expect(findTermRanges(source, "aa")).toEqual([{ start: 0, end: 2 }]);
  });

  it("区间映射回原文, 重音与大小写不影响位置", () => {
    const source = foldTextWithOrigins("Un Éclair");

    expect(findTermRanges(source, "eclair")).toEqual([{ start: 3, end: 9 }]);
  });

  it("命中一个拆开的字符的一部分时区间覆盖整个原字符", () => {
    const source = foldTextWithOrigins("ﬁx");

    expect(findTermRanges(source, "i")).toEqual([{ start: 0, end: 1 }]);
  });

  it("没有出现或词为空时返回空数组", () => {
    const source = foldTextWithOrigins("abc");

    expect(findTermRanges(source, "z")).toEqual([]);
    expect(findTermRanges(source, "")).toEqual([]);
  });
});
