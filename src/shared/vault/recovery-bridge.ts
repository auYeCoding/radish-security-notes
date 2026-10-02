import type { VaultOperationResult } from "./vault-operation-result";

/**
 * 保存恢复词文本文件的结果: 已保存, 用户在保存对话框中取消, 或写入失败.
 */
export type RecoveryTextFileStatus = "saved" | "cancelled" | "failed";

/**
 * preload 暴露给渲染进程的恢复接口, 渲染进程经它校验恢复词, 凭词恢复保险库与保存文本文件.
 * 恢复词只在调用期间经过进程边界, 主进程不保存.
 */
export interface RecoveryBridge {
  /**
   * 校验恢复词: 词数, 词表, 校验和, 并确认能打开现有的数据库. 不改动任何文件与状态.
   * @param words 用户输入的 24 个词.
   * @returns 校验结果, 词不在词表时带该词的序号.
   */
  verifyWords: (words: readonly string[]) => Promise<VaultOperationResult>;
  /**
   * 凭恢复词恢复保险库, 并用新主密码保护数据密钥.
   * @param words 用户输入的 24 个词.
   * @param masterPassword 新主密码.
   * @returns 恢复结果, 成功时保险库已解锁.
   */
  restoreWithMasterPassword: (
    words: readonly string[],
    masterPassword: string,
  ) => Promise<VaultOperationResult>;
  /**
   * 凭恢复词恢复保险库, 并改用系统保护数据密钥.
   * @param words 用户输入的 24 个词.
   * @returns 恢复结果, 成功时保险库已解锁.
   */
  restoreWithoutMasterPassword: (
    words: readonly string[],
  ) => Promise<VaultOperationResult>;
  /**
   * 把恢复词保存为明文文本文件, 保存位置由用户在系统保存对话框中选择.
   * @param words 要保存的 24 个词.
   * @returns 保存结果.
   */
  saveTextFile: (words: readonly string[]) => Promise<RecoveryTextFileStatus>;
}
