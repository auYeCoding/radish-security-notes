import type { VaultOperationResult } from "./vault-operation-result";
import type { VaultSetupResult } from "./vault-setup-result";

/**
 * 保存恢复词文本文件的结果: 已保存, 用户在保存对话框中取消, 或写入失败.
 */
export type RecoveryTextFileStatus = "saved" | "cancelled" | "failed";

/**
 * 查看恢复密钥的结果: 成功时带由数据密钥重新编码的恢复词, 失败时带原因. 与设置保险库的结果
 * 形状相同, 沿用同一个定义.
 */
export type RecoveryKeyViewResult = VaultSetupResult;

/**
 * preload 暴露给渲染进程的恢复接口, 渲染进程经它校验恢复词, 凭词恢复保险库, 保存文本文件与
 * 查看恢复密钥. 恢复词只在调用期间经过进程边界, 主进程不保存.
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
  /**
   * 查看恢复密钥: 保险库已解锁时, 主进程重新解出数据密钥并编码成 24 个词, 内容与首次展示的相同.
   * 设了主密码时要用输入的主密码验证, 由系统保护时不需要.
   * @param masterPassword 用户输入的当前主密码, 由系统保护时不给.
   * @returns 查看结果, 失败时保险库状态与密钥文件都不变.
   */
  viewKey: (masterPassword?: string) => Promise<RecoveryKeyViewResult>;
}
