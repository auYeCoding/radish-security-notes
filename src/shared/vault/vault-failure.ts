/**
 * 保险库进入失败状态的全部原因: 有数据库文件却没有密钥文件, 有密钥文件却没有数据库文件,
 * 两个文件都在但数据库打不开, 以及其它意外失败.
 */
export const VAULT_FAILURE_CAUSES = [
  "key-file-missing",
  "database-missing",
  "database-unreadable",
  "unexpected",
] as const;

/**
 * 保险库进入失败状态的原因.
 */
export type VaultFailureCause = (typeof VAULT_FAILURE_CAUSES)[number];

/**
 * 失败发生的阶段: 应用启动判定状态, 首次设置, 用主密码解锁, 凭恢复词恢复.
 */
export const VAULT_FAILURE_STAGES = [
  "startup",
  "setup",
  "unlock",
  "restore",
] as const;

/**
 * 失败发生的阶段.
 */
export type VaultFailureStage = (typeof VAULT_FAILURE_STAGES)[number];

/**
 * 失败页用来说明原因并供用户提交的诊断信息. 只含原因代码, 阶段和错误类名, 不含错误消息正文,
 * 更不含主密码与数据密钥.
 */
export interface VaultFailureInfo {
  /**
   * 失败的原因.
   */
  readonly cause: VaultFailureCause;
  /**
   * 失败发生的阶段.
   */
  readonly stage: VaultFailureStage;
  /**
   * 底层错误的类名, 失败由文件不一致检测发现而没有底层错误时为 undefined.
   */
  readonly errorName: string | undefined;
}
