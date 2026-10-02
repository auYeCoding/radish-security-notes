import { describe, expect, it } from "vitest";

import { DATA_KEY_BYTES, generateDataKey } from "./data-key";
import {
  RecoveryChecksumError,
  RecoveryUnknownWordError,
  RecoveryWordCountError,
  dataKeyToRecoveryWords,
  recoveryWordsToDataKey,
} from "./recovery-phrase";

/**
 * 全零数据密钥对应的标准 BIP39 词.
 */
const ZERO_KEY_WORDS = [...Array<string>(23).fill("abandon"), "art"];

describe("dataKeyToRecoveryWords", () => {
  it("32 字节的数据密钥编码成 24 个词", () => {
    expect(dataKeyToRecoveryWords(generateDataKey())).toHaveLength(24);
  });

  it("全零密钥得到标准的 BIP39 向量", () => {
    const words = dataKeyToRecoveryWords(Buffer.alloc(DATA_KEY_BYTES));

    expect(words).toEqual(ZERO_KEY_WORDS);
  });

  it("全 ff 密钥得到标准的 BIP39 向量", () => {
    const words = dataKeyToRecoveryWords(Buffer.alloc(DATA_KEY_BYTES, 0xff));

    expect(words).toEqual([...Array<string>(23).fill("zoo"), "vote"]);
  });
});

describe("recoveryWordsToDataKey 还原", () => {
  it("随机数据密钥编码后能还原", () => {
    const dataKey = generateDataKey();

    const restored = recoveryWordsToDataKey(dataKeyToRecoveryWords(dataKey));

    expect(restored.equals(dataKey)).toBe(true);
  });

  it("接受大小写与首尾空白不同的输入", () => {
    const messy = ZERO_KEY_WORDS.map((word, index) =>
      index % 2 === 0 ? ` ${word.toUpperCase()} ` : word,
    );

    expect(recoveryWordsToDataKey(messy).equals(Buffer.alloc(32))).toBe(true);
  });

  it("词数不是 24 时抛出词数错误", () => {
    expect(() => recoveryWordsToDataKey(ZERO_KEY_WORDS.slice(1))).toThrow(
      RecoveryWordCountError,
    );
    expect(() => recoveryWordsToDataKey([])).toThrow(RecoveryWordCountError);
  });
});

describe("recoveryWordsToDataKey 词表", () => {
  it("词不在词表时指出第几个词, 错误信息不含词本身", () => {
    const words = [...ZERO_KEY_WORDS];
    words[6] = "notaword";

    const attempt = (): Buffer => recoveryWordsToDataKey(words);

    expect(attempt).toThrow(RecoveryUnknownWordError);
    expect(attempt).toThrow(expect.objectContaining({ position: 7 }));
    expect(attempt).not.toThrow(/notaword/);
  });

  it("空的输入框按不在词表处理, 指出它的位置", () => {
    const words = [...ZERO_KEY_WORDS];
    words[23] = "";

    expect(() => recoveryWordsToDataKey(words)).toThrow(
      expect.objectContaining({ position: 24 }),
    );
  });

  it("多个词不在词表时先报最靠前的", () => {
    const words = [...ZERO_KEY_WORDS];
    words[20] = "zzz";
    words[3] = "yyy";

    expect(() => recoveryWordsToDataKey(words)).toThrow(
      expect.objectContaining({ position: 4 }),
    );
  });
});

describe("recoveryWordsToDataKey 校验和", () => {
  it("词都在词表但校验和不对时抛出校验和错误", () => {
    const words = [...ZERO_KEY_WORDS];
    words[23] = "abandon";

    expect(() => recoveryWordsToDataKey(words)).toThrow(RecoveryChecksumError);
  });

  it("校验和错误的信息与原因都不含词", () => {
    const words = [...ZERO_KEY_WORDS];
    words[23] = "zoo";

    expect(() => recoveryWordsToDataKey(words)).toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining("zoo") as string,
        cause: expect.not.stringMatching(/zoo/) as unknown,
      }),
    );
  });

  it("抄错一个词不会还原出原来的数据密钥", () => {
    const dataKey = generateDataKey();
    const words = dataKeyToRecoveryWords(dataKey);
    const mistaken = [...words];
    mistaken[0] = words[0] === "abandon" ? "ability" : "abandon";

    const outcome = ((): Buffer | undefined => {
      try {
        return recoveryWordsToDataKey(mistaken);
      } catch {
        return undefined;
      }
    })();

    expect(outcome?.equals(dataKey) ?? false).toBe(false);
  });
});
