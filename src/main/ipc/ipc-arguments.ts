/**
 * 一次调用最多接受的恢复词个数. 真正的词数规则由保险库服务判定, 这里只防止畸形的超大输入.
 */
const MAX_RECOVERY_WORD_ARGUMENTS = 64;

/**
 * 单个恢复词允许的最大字符数. 词表里最长的词是 8 个字母, 留出宽裕的余量给输入错误.
 */
const MAX_RECOVERY_WORD_LENGTH = 64;

/**
 * 校验渲染进程传来的主密码参数是字符串.
 * @param masterPassword 渲染进程传来的值.
 * @returns 校验通过的主密码.
 * @throws Error 当参数不是字符串时.
 */
export function requireMasterPassword(masterPassword: unknown): string {
  if (typeof masterPassword !== "string") {
    throw new Error("无效的主密码");
  }
  return masterPassword;
}

/**
 * 校验渲染进程传来的恢复词参数是由字符串组成的有限长数组. 词数, 词表与校验和由保险库服务
 * 判定并带着原因返回, 这里只保证类型与大小.
 * @param words 渲染进程传来的值.
 * @returns 校验通过的恢复词.
 * @throws Error 当参数不是字符串数组, 或数组与其中的词过大时.
 */
export function requireRecoveryWords(words: unknown): string[] {
  if (
    !Array.isArray(words) ||
    words.length > MAX_RECOVERY_WORD_ARGUMENTS ||
    !words.every(
      (word) =>
        typeof word === "string" && word.length <= MAX_RECOVERY_WORD_LENGTH,
    )
  ) {
    throw new Error("无效的恢复词");
  }
  return [...words] as string[];
}
