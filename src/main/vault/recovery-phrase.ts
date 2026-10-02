import { entropyToMnemonic, mnemonicToEntropy } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import {
  RECOVERY_WORD_COUNT,
  normalizeRecoveryWord,
} from "@shared/vault/recovery-words";

/**
 * 恢复词的个数不是 24 个时抛出的错误.
 */
export class RecoveryWordCountError extends Error {
  /**
   * 创建恢复词个数不对的错误.
   * @param actualCount 实际收到的词数.
   */
  constructor(actualCount: number) {
    super(`恢复词应有 ${RECOVERY_WORD_COUNT} 个, 实际收到 ${actualCount} 个`);
    this.name = "RecoveryWordCountError";
  }
}

/**
 * 某个词不在英文词表时抛出的错误. 只记录位置, 不记录词本身, 避免词进入日志.
 */
export class RecoveryUnknownWordError extends Error {
  /**
   * 创建词不在词表的错误.
   * @param position 该词在恢复词中的序号, 从 1 起.
   */
  constructor(readonly position: number) {
    super(`第 ${position} 个恢复词不在词表中`);
    this.name = "RecoveryUnknownWordError";
  }
}

/**
 * 恢复词的校验和不通过时抛出的错误: 词的拼写, 顺序或个别词有误.
 */
export class RecoveryChecksumError extends Error {
  /**
   * 创建校验和不通过的错误.
   * @param options 错误选项, 用于保留底层原因.
   */
  constructor(options?: ErrorOptions) {
    super("恢复词的校验和不通过", options);
    this.name = "RecoveryChecksumError";
  }
}

/**
 * 英文词表的成员集合, 用来逐词定位不在词表的词.
 */
const WORDLIST_MEMBERS: ReadonlySet<string> = new Set(wordlist);

/**
 * 把数据密钥编码成 24 个英文词.
 * @param dataKey 32 字节的数据密钥.
 * @returns 24 个恢复词.
 */
export function dataKeyToRecoveryWords(dataKey: Buffer): string[] {
  return entropyToMnemonic(dataKey, wordlist).split(" ");
}

/**
 * 找出第一个不在词表的词的序号.
 * @param words 已规整的恢复词.
 * @returns 序号 (从 1 起), 全部在词表时为 undefined.
 */
function findUnknownWordPosition(words: readonly string[]): number | undefined {
  const index = words.findIndex((word) => !WORDLIST_MEMBERS.has(word));
  return index === -1 ? undefined : index + 1;
}

/**
 * 把已确认都在词表中的词解码成数据密钥, 校验和不通过时抛错.
 * @param words 已规整且都在词表中的 24 个词.
 * @returns 32 字节的数据密钥.
 * @throws RecoveryChecksumError 当校验和不通过时.
 */
function decodeWords(words: readonly string[]): Buffer {
  let entropy: Uint8Array;
  try {
    entropy = mnemonicToEntropy(words.join(" "), wordlist);
  } catch (error) {
    throw new RecoveryChecksumError({ cause: error });
  }
  const dataKey = Buffer.from(entropy);
  entropy.fill(0);
  return dataKey;
}

/**
 * 把用户输入的 24 个词还原成数据密钥. 先规整输入, 再依次检查词数, 词表与校验和.
 * @param words 用户输入的词.
 * @returns 32 字节的数据密钥, 调用方用完后应清零.
 * @throws RecoveryWordCountError 当词数不是 24 时.
 * @throws RecoveryUnknownWordError 当某个词不在词表时.
 * @throws RecoveryChecksumError 当校验和不通过时.
 */
export function recoveryWordsToDataKey(words: readonly string[]): Buffer {
  const normalizedWords = words.map(normalizeRecoveryWord);
  if (normalizedWords.length !== RECOVERY_WORD_COUNT) {
    throw new RecoveryWordCountError(normalizedWords.length);
  }
  const unknownPosition = findUnknownWordPosition(normalizedWords);
  if (unknownPosition !== undefined) {
    throw new RecoveryUnknownWordError(unknownPosition);
  }
  return decodeWords(normalizedWords);
}
