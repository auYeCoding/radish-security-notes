import type { AutoLockReason } from "@shared/vault/auto-lock-reason";
import type {
  RecoveryBridge,
  RecoveryKeyViewResult,
  RecoveryTextFileStatus,
} from "@shared/vault/recovery-bridge";
import type { VaultBridge } from "@shared/vault/vault-bridge";
import type { VaultFailureInfo } from "@shared/vault/vault-failure";
import type { VaultOperationResult } from "@shared/vault/vault-operation-result";
import type { VaultSetupResult } from "@shared/vault/vault-setup-result";
import type { VaultStatus } from "@shared/vault/vault-status";
import type { StoreApi } from "zustand/vanilla";

/**
 * 保险库状态: 决定显示引导页, 解锁页, 恢复页, 失败页, 恢复词页还是三栏主界面.
 */
export interface VaultState {
  /**
   * 保险库当前的状态.
   */
  readonly status: VaultStatus;
  /**
   * 刚设置完保险库, 还没有展示并确认的恢复词. 有值时无论状态如何都显示恢复词页, 确认后清空.
   */
  readonly pendingRecoveryWords: readonly string[] | undefined;
  /**
   * 用户是否在解锁页或失败页选择了凭恢复词恢复.
   */
  readonly isRestoreRequested: boolean;
  /**
   * 保险库被主进程自动锁定的原因, 解锁页据此说明为什么被锁. 只有自动锁定时有值, 手动锁定, 启动时
   * 就是锁定的情形为 undefined, 解锁成功后清除.
   */
  readonly lockReason: AutoLockReason | undefined;
  /**
   * 保险库进入失败状态的原因, 阶段和错误类名, 失败页据此说明原因. 只有状态是失败时可能有值, 取回
   * 之前或主进程没有记录时为 undefined.
   */
  readonly failure: VaultFailureInfo | undefined;
}

/**
 * 写入保险库状态的函数.
 */
export type VaultStateSetter = (partial: Partial<VaultState>) => void;

/**
 * 保险库动作: 经主进程设置主密码, 跳过, 解锁, 凭恢复词恢复, 并让状态跟随结果.
 */
export interface VaultActions {
  /**
   * 首次设置主密码.
   * @param masterPassword 用户设置的主密码.
   * @returns 设置结果, 成功时带恢复词并记为待确认.
   */
  setupWithMasterPassword: (
    masterPassword: string,
  ) => Promise<VaultSetupResult>;
  /**
   * 首次启动时跳过主密码.
   * @returns 设置结果, 成功时带恢复词并记为待确认.
   */
  setupWithoutMasterPassword: () => Promise<VaultSetupResult>;
  /**
   * 用主密码解锁.
   * @param masterPassword 用户输入的主密码.
   * @returns 解锁结果, 成功时状态变为已解锁.
   */
  unlock: (masterPassword: string) => Promise<VaultOperationResult>;
  /**
   * 锁定已解锁的保险库.
   * @returns 锁定结果, 成功时状态变为已锁定, 失败时状态不变 (有任务进行中, 未设主密码等).
   */
  lock: () => Promise<VaultOperationResult>;
  /**
   * 跟上主进程的自动锁定: 当前是已解锁时变为已锁定并记下原因, 清除待确认的恢复词与恢复请求, 与手动
   * 锁定成功后的状态一致. 当前不是已解锁时忽略.
   * @param reason 自动锁定的原因.
   */
  applyAutoLock: (reason: AutoLockReason) => void;
  /**
   * 用户重输恢复词确认通过, 丢弃待确认的恢复词, 进入三栏主界面.
   */
  confirmRecoveryWords: () => void;
  /**
   * 进入凭恢复词恢复的流程.
   */
  requestRestore: () => void;
  /**
   * 放弃恢复, 回到解锁页或失败页.
   */
  cancelRestore: () => void;
  /**
   * 校验恢复词, 不改变保险库状态.
   * @param words 用户输入的 24 个词.
   * @returns 校验结果.
   */
  verifyRecoveryWords: (
    words: readonly string[],
  ) => Promise<VaultOperationResult>;
  /**
   * 凭恢复词恢复并设置新主密码.
   * @param words 用户输入的 24 个词.
   * @param masterPassword 新主密码.
   * @returns 恢复结果, 成功时状态变为已解锁.
   */
  restoreWithMasterPassword: (
    words: readonly string[],
    masterPassword: string,
  ) => Promise<VaultOperationResult>;
  /**
   * 凭恢复词恢复并改用系统保护.
   * @param words 用户输入的 24 个词.
   * @returns 恢复结果, 成功时状态变为已解锁.
   */
  restoreWithoutMasterPassword: (
    words: readonly string[],
  ) => Promise<VaultOperationResult>;
  /**
   * 把恢复词保存为文本文件.
   * @param words 要保存的 24 个词.
   * @returns 保存状态.
   */
  saveRecoveryTextFile: (
    words: readonly string[],
  ) => Promise<RecoveryTextFileStatus>;
  /**
   * 查看恢复密钥, 不改变保险库状态, 失败也不进失败页.
   * @param masterPassword 用户输入的当前主密码, 由系统保护数据密钥时不给.
   * @returns 查看结果, 成功时带 24 个恢复词.
   */
  viewRecoveryKey: (masterPassword?: string) => Promise<RecoveryKeyViewResult>;
}

/**
 * 保险库 store 的完整形状.
 */
export type VaultStore = StoreApi<VaultState & VaultActions>;

/**
 * 创建保险库 store 的依赖.
 */
export interface VaultStoreDependencies {
  /**
   * 主进程提供的保险库接口.
   */
  readonly bridge: VaultBridge;
  /**
   * 主进程提供的恢复接口.
   */
  readonly recoveryBridge: RecoveryBridge;
  /**
   * 启动时从主进程取得的保险库状态.
   */
  readonly initialStatus: VaultStatus;
  /**
   * 启动时从主进程取得的失败信息, 初始状态不是失败或主进程没有记录时不给.
   */
  readonly initialFailure?: VaultFailureInfo;
}
