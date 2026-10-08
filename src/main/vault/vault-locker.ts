import {
  VAULT_OPERATION_SUCCEEDED,
  vaultOperationFailed,
  type VaultOperationResult,
} from "@shared/vault/vault-operation-result";

import { attemptSilently } from "./attempt-silently";
import type { KeyFileStore } from "./key-file-store";
import { MASTER_PASSWORD_PROTECTION } from "./key-record";
import type { LockRegistry } from "./lock-registry";
import type { OperationExclusion } from "./operation-exclusion";

/**
 * 保险库锁定器的依赖.
 */
export interface VaultLockerDependencies {
  /**
   * 与保险库其它操作共用的互斥标志, 锁定期间设置, 解锁, 恢复, 切换主密码与查看恢复密钥都被拒绝.
   */
  readonly exclusion: OperationExclusion;
  /**
   * 登记处, 锁定前问它有没有任务进行中, 锁定时让它释放各模块的内存状态.
   */
  readonly registry: LockRegistry;
  /**
   * 密钥文件读取, 每次锁定都重新读取当前的保护方式.
   */
  readonly keyFileStore: Pick<KeyFileStore, "read">;
  /**
   * 保险库当前是否已解锁.
   */
  readonly isUnlocked: () => boolean;
  /**
   * 关闭数据库并丢弃它的引用. 关闭抛错时引用也必须已丢弃.
   */
  readonly discardDatabase: () => void;
  /**
   * 把保险库状态置为锁定.
   */
  readonly markLocked: () => void;
}

/**
 * 锁定选项.
 */
export interface VaultLockOptions {
  /**
   * 是否忽略进行中的任务直接锁定, 只有自动锁定推迟到上限后使用. 导入与恢复的数据库写入是单个同步
   * 事务, 导出经原子写文件, 强制锁定只会让进行中的任务失败, 不会留下写一半的数据.
   */
  readonly shouldIgnoreRunningTasks?: boolean;
}

/**
 * 保险库锁定器: 已解锁并由主密码保护的保险库, 在没有任务进行中时 (或明确要求忽略任务时) 关闭数据库,
 * 丢弃内存里的解密状态, 回到锁定. 数据密钥在解锁时打开数据库后就已清零, 锁定时没有缓冲区可清,
 * 关闭连接并丢弃引用之后主进程里不再留有可用的密钥. 关闭失败仍进入锁定, 失败原因不写日志.
 */
export class VaultLocker {
  /**
   * 创建保险库锁定器.
   * @param dependencies 锁定器依赖.
   */
  constructor(private readonly dependencies: VaultLockerDependencies) {}

  /**
   * 锁定保险库.
   * @param options 锁定选项, 不给时有任务进行中就拒绝.
   * @returns 成功; 状态不符或互斥被占用时为 `unexpected-state`; 未由主密码保护时为
   * `master-password-required`; 有任务进行中且没有要求忽略时为 `tasks-running`, 这三种失败都不改变
   * 保险库状态.
   */
  async lock(options: VaultLockOptions = {}): Promise<VaultOperationResult> {
    const { exclusion, isUnlocked } = this.dependencies;
    if (!isUnlocked() || !exclusion.tryAcquire()) {
      return vaultOperationFailed("unexpected-state");
    }
    try {
      return await this.lockExclusively(options);
    } finally {
      exclusion.release();
    }
  }

  /**
   * 在持有互斥的情况下锁定: 校验保护方式与任务, 通过后同步完成关库, 置状态与释放.
   * @param options 锁定选项.
   * @returns 锁定结果.
   */
  private async lockExclusively(
    options: VaultLockOptions,
  ): Promise<VaultOperationResult> {
    const { keyFileStore, registry } = this.dependencies;
    const record = await keyFileStore.read().catch(() => undefined);
    if (record?.protection !== MASTER_PASSWORD_PROTECTION) {
      return vaultOperationFailed("master-password-required");
    }
    if (
      options.shouldIgnoreRunningTasks !== true &&
      registry.hasRunningTask()
    ) {
      return vaultOperationFailed("tasks-running");
    }
    attemptSilently(this.dependencies.discardDatabase);
    this.dependencies.markLocked();
    registry.releaseAll();
    return VAULT_OPERATION_SUCCEEDED;
  }
}
