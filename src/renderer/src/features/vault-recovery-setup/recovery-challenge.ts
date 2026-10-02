import {
  RECOVERY_CHALLENGE_WORD_COUNT,
  RECOVERY_WORD_COUNT,
  normalizeRecoveryWord,
} from "@shared/vault/recovery-words";

/**
 * 产生 [0, 1) 内随机数的函数, 默认用 `Math.random`, 测试里换成确定的序列.
 */
export type RandomSource = () => number;

/**
 * 从 1 到词数之间随机抽出若干个不同的序号, 升序排列. 用于设置时让用户重输其中几个词.
 * @param wordCount 词的总数.
 * @param pickCount 要抽出的序号个数, 不能超过词的总数.
 * @param random 随机数来源.
 * @returns 升序排列的序号 (从 1 起).
 */
export function pickChallengePositions(
  wordCount: number,
  pickCount: number,
  random: RandomSource = Math.random,
): number[] {
  const candidates = Array.from({ length: wordCount }, (_, index) => index + 1);
  const picked: number[] = [];
  while (picked.length < pickCount) {
    const index = Math.floor(random() * candidates.length);
    picked.push(...candidates.splice(index, 1));
  }
  return picked.sort((first, second) => first - second);
}

/**
 * 为设置时的确认步骤抽出要重输的序号: 从全部恢复词里随机抽 3 个不同的位置.
 * @param random 随机数来源.
 * @returns 升序排列的序号 (从 1 起).
 */
export function pickConfirmationPositions(
  random: RandomSource = Math.random,
): number[] {
  return pickChallengePositions(
    RECOVERY_WORD_COUNT,
    RECOVERY_CHALLENGE_WORD_COUNT,
    random,
  );
}

/**
 * 找出答错的序号. 答案与词都先规整再比较, 空答案算错.
 * @param words 完整的恢复词.
 * @param positions 被要求重输的序号 (从 1 起).
 * @param answers 用户按 `positions` 顺序填写的答案.
 * @returns 答错的序号, 全部答对时为空.
 */
export function findWrongPositions(
  words: readonly string[],
  positions: readonly number[],
  answers: readonly string[],
): number[] {
  return positions.filter(
    (position, index) =>
      normalizeRecoveryWord(answers[index] ?? "") !==
      normalizeRecoveryWord(words[position - 1] ?? ""),
  );
}
