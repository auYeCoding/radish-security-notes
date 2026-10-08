import type { RecoveryKeyViewResult } from "@shared/vault/recovery-bridge";
import { vaultOperationFailed } from "@shared/vault/vault-operation-result";

import {
  unprotectDataKey,
  type DataKeyUnprotection,
} from "./data-key-unprotector";
import type { KeyFileStore } from "./key-file-store";
import {
  createNonFatalOperationGuard,
  type NonFatalOperationGuard,
} from "./non-fatal-operation-guard";
import type { OperationExclusion } from "./operation-exclusion";
import { dataKeyToRecoveryWords } from "./recovery-phrase";
import type { SafeStoragePort } from "./safe-storage-port";

/**
 * 恢复密钥查看器的依赖.
 */
export interface RecoveryKeyViewerDependencies {
  /**
   * 密钥文件读取, 每次查看都重新读取当前的保护方式.
   */
  readonly keyFileStore: Pick<KeyFileStore, "read">;
  /**
   * 系统保护时解开数据密钥用的 safeStorage 接口.
   */
  readonly safeStorage: SafeStoragePort;
  /**
   * 与保险库其它操作共用的互斥标志, 查看期间锁定等其它操作被拒绝.
   */
  readonly exclusion: OperationExclusion;
  /**
   * 保险库当前是否已解锁, 只有已解锁时才允许查看.
   */
  readonly isUnlocked: () => boolean;
  /**
   * 查看意外失败时的回调, 参数是底层错误.
   */
  readonly onFailure: (error: unknown) => void;
}

/**
 * 恢复密钥查看器: 已解锁的保险库按当前保护方式重新解出数据密钥, 再编码成 24 个恢复词. 数据密钥
 * 不变, 所以词与首次展示的相同; 数据密钥每次重新解出, 编码后立即清零, 词只随结果返回, 不保存,
 * 不写日志. 查看失败不改变保险库状态, 也不改动密钥文件.
 */
export class RecoveryKeyViewer {
  /**
   * 同一时间只允许一次查看, 意外失败不改变保险库状态.
   */
  private readonly guard: NonFatalOperationGuard;

  /**
   * 创建恢复密钥查看器.
   * @param dependencies 查看器依赖.
   */
  constructor(private readonly dependencies: RecoveryKeyViewerDependencies) {
    this.guard = createNonFatalOperationGuard(
      dependencies.onFailure,
      dependencies.exclusion,
    );
  }

  /**
   * 查看恢复密钥.
   * @param masterPassword 用户输入的当前主密码, 由系统保护数据密钥时不需要.
   * @returns 成功时带 24 个恢复词, 失败时带原因.
   */
  view(masterPassword: string | undefined): Promise<RecoveryKeyViewResult> {
    return this.guard.run(() => this.runView(masterPassword));
  }

  /**
   * 执行查看: 已解锁时读密钥文件, 解出数据密钥并编码.
   * @param masterPassword 用户输入的当前主密码.
   * @returns 查看结果.
   */
  private async runView(
    masterPassword: string | undefined,
  ): Promise<RecoveryKeyViewResult> {
    const record = this.dependencies.isUnlocked()
      ? await this.dependencies.keyFileStore.read()
      : undefined;
    if (record === undefined) {
      return vaultOperationFailed("unexpected-state");
    }
    const unprotection = await unprotectDataKey(
      record,
      masterPassword,
      this.dependencies.safeStorage,
    );
    return this.encode(unprotection);
  }

  /**
   * 把解出的数据密钥编码成恢复词, 编码后无论成败都清零数据密钥.
   * @param unprotection 解出数据密钥的结果.
   * @returns 查看结果.
   */
  private encode(unprotection: DataKeyUnprotection): RecoveryKeyViewResult {
    switch (unprotection.outcome) {
      case "password-required":
        return vaultOperationFailed("unexpected-state");
      case "wrong-password":
        return vaultOperationFailed("wrong-password");
      default:
        try {
          return {
            ok: true,
            recoveryWords: dataKeyToRecoveryWords(unprotection.dataKey),
          };
        } finally {
          unprotection.dataKey.fill(0);
        }
    }
  }
}
