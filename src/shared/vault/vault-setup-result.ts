import type { VaultOperationFailure } from "./vault-operation-result";

/**
 * 设置保险库成功的结果, 带着只在这一刻生成的恢复词.
 */
export interface VaultSetupSuccess {
  /**
   * 操作是否成功, 成功时恒为 true.
   */
  readonly ok: true;
  /**
   * 由数据密钥编码的恢复词, 主进程不保存, 渲染端展示并确认后丢弃.
   */
  readonly recoveryWords: readonly string[];
}

/**
 * 设置保险库的结果: 成功并带恢复词, 或带原因的失败.
 */
export type VaultSetupResult = VaultSetupSuccess | VaultOperationFailure;
