import { describe, expect, it } from "vitest";

import {
  RECOVERY_CHALLENGE_WORD_COUNT,
  RECOVERY_WORD_COUNT,
  normalizeRecoveryWord,
  splitRecoveryText,
} from "./recovery-words";

describe("恢复词常量", () => {
  it("恢复密钥是 24 个词, 重输 3 个词", () => {
    expect(RECOVERY_WORD_COUNT).toBe(24);
    expect(RECOVERY_CHALLENGE_WORD_COUNT).toBe(3);
  });
});

describe("normalizeRecoveryWord", () => {
  it("去掉首尾空白并转小写", () => {
    expect(normalizeRecoveryWord("  Abandon\t")).toBe("abandon");
  });

  it("全角字母转成半角", () => {
    expect(normalizeRecoveryWord("ＡＢＩＬＩＴＹ")).toBe("ability");
  });

  it("空白串规整为空串", () => {
    expect(normalizeRecoveryWord(" \n ")).toBe("");
  });
});

describe("splitRecoveryText", () => {
  it("按任意空白切词并规整", () => {
    expect(splitRecoveryText("Abandon  ability\nable\tabout")).toEqual([
      "abandon",
      "ability",
      "able",
      "about",
    ]);
  });

  it("忽略首尾空白与多余空行", () => {
    expect(splitRecoveryText("\n  zoo  \n\n")).toEqual(["zoo"]);
  });

  it("空文字得到空列表", () => {
    expect(splitRecoveryText("   ")).toEqual([]);
  });
});
