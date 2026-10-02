/**
 * 文本文件默认名的前缀, 用 ASCII 避免不同系统与工具的编码问题.
 */
const RECOVERY_TEXT_FILE_PREFIX = "radish-recovery-key";

/**
 * 文本文件的扩展名, 不含点.
 */
export const RECOVERY_TEXT_FILE_EXTENSION = "txt";

/**
 * 生成保存对话框里的默认文件名.
 * @param generatedDate 生成日期, 形如 `2026-10-02`.
 * @returns 形如 `radish-recovery-key-2026-10-02.txt` 的文件名.
 */
export function buildRecoveryTextFileName(generatedDate: string): string {
  return `${RECOVERY_TEXT_FILE_PREFIX}-${generatedDate}.${RECOVERY_TEXT_FILE_EXTENSION}`;
}
