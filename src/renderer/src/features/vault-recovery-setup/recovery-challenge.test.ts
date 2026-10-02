import { describe, expect, it } from "vitest";

import {
  findWrongPositions,
  pickChallengePositions,
  pickConfirmationPositions,
} from "./recovery-challenge";

/**
 * 测试用的 24 个词, 第 n 个词是 `wordn`.
 */
const WORDS = Array.from({ length: 24 }, (_, index) => `word${index + 1}`);

describe("pickChallengePositions", () => {
  it("抽出指定个数的不同序号, 升序排列, 都在 1 到词数之间", () => {
    for (let round = 0; round < 50; round += 1) {
      const positions = pickChallengePositions(24, 3);

      expect(positions).toHaveLength(3);
      expect(new Set(positions).size).toBe(3);
      expect([...positions].sort((a, b) => a - b)).toEqual(positions);
      expect(positions.every((value) => value >= 1 && value <= 24)).toBe(true);
    }
  });

  it("随机数来源决定结果", () => {
    const sequence = [0, 0, 0];
    let cursor = 0;

    const positions = pickChallengePositions(24, 3, () => {
      cursor += 1;
      return sequence[cursor - 1] ?? 0;
    });

    expect(positions).toEqual([1, 2, 3]);
  });

  it("随机数接近 1 时取到最后一个序号", () => {
    expect(pickChallengePositions(24, 1, () => 0.999999)).toEqual([24]);
  });

  it("不同次抽取的结果会变化", () => {
    const results = new Set(
      Array.from({ length: 30 }, () => pickChallengePositions(24, 3).join()),
    );

    expect(results.size).toBeGreaterThan(1);
  });
});

describe("pickConfirmationPositions", () => {
  it("从 24 个词里抽 3 个不同的序号", () => {
    const positions = pickConfirmationPositions();

    expect(positions).toHaveLength(3);
    expect(new Set(positions).size).toBe(3);
    expect(positions.every((value) => value >= 1 && value <= 24)).toBe(true);
  });
});

describe("findWrongPositions", () => {
  it("全部答对时返回空", () => {
    expect(
      findWrongPositions(WORDS, [2, 9, 20], ["word2", "word9", "word20"]),
    ).toEqual([]);
  });

  it("忽略大小写与首尾空白", () => {
    expect(findWrongPositions(WORDS, [2], [" WORD2 "])).toEqual([]);
  });

  it("返回答错的序号, 空答案也算错", () => {
    expect(
      findWrongPositions(WORDS, [2, 9, 20], ["word2", "word10", ""]),
    ).toEqual([9, 20]);
  });

  it("答案少于要求的个数时, 缺的答案算错", () => {
    expect(findWrongPositions(WORDS, [2, 9], ["word2"])).toEqual([9]);
  });
});
