import { createOperationExclusion } from "../vault/operation-exclusion";
import { RecoveryKeyViewer } from "../vault/recovery-key-viewer";
import type { SafeStoragePort } from "../vault/safe-storage-port";
import type { SwitchRig } from "./master-password-switch-rig";
import { createFakeSafeStorage } from "./vault-test-fixtures";

/**
 * 创建查看器的选项.
 */
export interface ViewerOptions {
  /**
   * 保险库是否已解锁, 默认已解锁.
   */
  readonly isUnlocked?: boolean;
  /**
   * 查看时使用的 safeStorage, 默认是正常工作的假 safeStorage.
   */
  readonly safeStorage?: SafeStoragePort;
}

/**
 * 查看器与它经失败回调报告过的错误.
 */
export interface ViewerRig {
  /**
   * 被测的查看器.
   */
  readonly viewer: RecoveryKeyViewer;
  /**
   * 查看器经失败回调报告过的错误.
   */
  readonly failures: unknown[];
}

/**
 * 在已写好密钥文件的装置上创建查看器.
 * @param rig 切换测试装置, 提供密钥文件存储.
 * @param options 可覆盖的依赖.
 * @returns 查看器与失败记录.
 */
export function createViewer(
  rig: SwitchRig,
  options: ViewerOptions = {},
): ViewerRig {
  const failures: unknown[] = [];
  const viewer = new RecoveryKeyViewer({
    keyFileStore: rig.keyFileStore,
    safeStorage: options.safeStorage ?? createFakeSafeStorage(),
    exclusion: createOperationExclusion(),
    isUnlocked: () => options.isUnlocked ?? true,
    onFailure: (error) => failures.push(error),
  });
  return { viewer, failures };
}
