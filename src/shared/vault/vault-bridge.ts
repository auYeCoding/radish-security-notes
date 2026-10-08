import type { VaultFailureInfo } from "./vault-failure";
import type { VaultOperationResult } from "./vault-operation-result";
import type { VaultSetupResult } from "./vault-setup-result";
import type { VaultStatus } from "./vault-status";

/**
 * preload 暴露给渲染进程的保险库接口, 渲染进程只经它设置主密码与解锁.
 */
export interface VaultBridge {
  /**
   * 读取保险库当前的启动状态.
   * @returns 启动状态.
   */
  getStatus: () => Promise<VaultStatus>;
  /**
   * 读取保险库进入失败状态的原因, 阶段和错误类名, 失败页据此说明原因. 不含主密码, 数据密钥和
   * 错误消息正文.
   * @returns 当前是失败状态且有记录时的失败信息, 否则为 undefined.
   */
  getFailure: () => Promise<VaultFailureInfo | undefined>;
  /**
   * 首次设置主密码, 主进程创建加密数据库并解锁.
   * @param masterPassword 用户设置的主密码.
   * @returns 设置结果, 成功时带恢复词.
   */
  setupWithMasterPassword: (
    masterPassword: string,
  ) => Promise<VaultSetupResult>;
  /**
   * 首次启动时跳过主密码, 主进程用系统保护数据密钥, 创建加密数据库并解锁.
   * @returns 设置结果, 成功时带恢复词.
   */
  setupWithoutMasterPassword: () => Promise<VaultSetupResult>;
  /**
   * 用主密码解锁已设置主密码的保险库.
   * @param masterPassword 用户输入的主密码.
   * @returns 解锁结果.
   */
  unlock: (masterPassword: string) => Promise<VaultOperationResult>;
  /**
   * 锁定已解锁的保险库: 主进程关闭数据库并丢弃解密状态, 之后要再次输入主密码才能进入.
   * @returns 锁定结果, 有任务进行中或未设主密码时为带原因的失败.
   */
  lock: () => Promise<VaultOperationResult>;
}
