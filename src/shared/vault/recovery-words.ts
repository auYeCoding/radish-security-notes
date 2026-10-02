/**
 * 恢复密钥包含的词数, 对应 256 位的数据密钥.
 */
export const RECOVERY_WORD_COUNT = 24;

/**
 * 设置时让用户重输的词数.
 */
export const RECOVERY_CHALLENGE_WORD_COUNT = 3;

/**
 * 规整用户输入的一个词: 去掉首尾空白, 全角字符转半角, 转小写. 词表只有小写英文字母.
 * @param word 用户输入的词.
 * @returns 规整后的词.
 */
export function normalizeRecoveryWord(word: string): string {
  return word.trim().normalize("NFKC").toLowerCase();
}

/**
 * 把一整段文字按空白切成词, 去掉空串并逐词规整, 用于粘贴整串恢复词.
 * @param text 用户粘贴的文字.
 * @returns 规整后的词列表.
 */
export function splitRecoveryText(text: string): string[] {
  return text
    .split(/\s+/)
    .map(normalizeRecoveryWord)
    .filter((word) => word.length > 0);
}
