import type { RecoveryTextFileLabels } from "./recovery-text-file-labels";

/**
 * 序号补零后的位数, 24 个词需要两位.
 */
const POSITION_DIGITS = 2;

/**
 * 生成文本文件内容的输入.
 */
export interface RecoveryTextFileInput {
  /**
   * 按序号排列的 24 个恢复词.
   */
  readonly words: readonly string[];
  /**
   * 已按界面语言取好的文案.
   */
  readonly labels: RecoveryTextFileLabels;
}

/**
 * 把词排成带序号的一行一个, 词原样拼接, 不经过翻译的占位符处理.
 * @param words 恢复词.
 * @returns 每个词一行的文本行.
 */
function numberWords(words: readonly string[]): string[] {
  return words.map(
    (word, index) =>
      `${String(index + 1).padStart(POSITION_DIGITS, "0")}. ${word}`,
  );
}

/**
 * 生成恢复词文本文件的内容: 标题, 生成日期, 用法, 带序号的词与警示语.
 * @param input 词与文案.
 * @returns 文件内容, 以换行结尾.
 */
export function buildRecoveryTextFile(input: RecoveryTextFileInput): string {
  const { labels, words } = input;
  return [
    labels.title,
    labels.generated,
    "",
    labels.usage,
    "",
    ...numberWords(words),
    "",
    labels.warning,
    "",
  ].join("\n");
}
