import type { VaultOperationResult } from "./vault-operation-result";

/**
 * preload 暴露给渲染进程的主密码开关接口, 渲染进程经它读取当前模式, 开启与关闭主密码. 数据
 * 密钥与恢复词都不经过它, 渲染进程只拿到布尔值与操作结果.
 */
export interface MasterPasswordBridge {
  /**
   * 读取保险库当前是否设了主密码, 取自主进程里密钥文件的保护方式.
   * @returns 设了主密码 (数据密钥由主密码保护) 时为 true, 由系统保护时为 false.
   */
  hasMasterPassword: () => Promise<boolean>;
  /**
   * 开启主密码: 保险库已解锁且当前由系统保护时, 改用新主密码保护, 当前会话保持解锁.
   * @param masterPassword 新主密码.
   * @returns 开启结果, 失败时保险库状态与密钥文件都不变.
   */
  enable: (masterPassword: string) => Promise<VaultOperationResult>;
  /**
   * 关闭主密码: 保险库已解锁且当前由主密码保护时, 校验当前主密码后改交系统保护, 下次启动
   * 不再要求输入.
   * @param currentPassword 当前主密码.
   * @returns 关闭结果, 失败时保险库状态与密钥文件都不变.
   */
  disable: (currentPassword: string) => Promise<VaultOperationResult>;
}
