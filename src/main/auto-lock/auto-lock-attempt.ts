import type {
  VaultFailureReason,
  VaultOperationResult,
} from "@shared/vault/vault-operation-result";

import type { VaultLockOptions } from "../vault/vault-locker";
import { shouldForceLock } from "./auto-lock-rules";

/**
 * 自动锁定对保险库的需求, 保险库服务满足它.
 */
export interface AutoLockVaultPort {
  /**
   * 保险库当前是否已解锁.
   * @returns 已解锁时为 true.
   */
  readonly isUnlocked: () => boolean;
  /**
   * 请求锁定保险库.
   * @param options 锁定选项.
   * @returns 锁定结果.
   */
  readonly lock: (options: VaultLockOptions) => Promise<VaultOperationResult>;
}

/**
 * 一次自动锁定尝试的结果归类: 已锁定; 被挡住, 下个周期重试; 不必再试; 这种保险库不适用自动锁定.
 */
export type AutoLockAttemptOutcome =
  "locked" | "deferred" | "dropped" | "not-applicable";

/**
 * 把锁定失败的原因归类. 有任务进行中, 或互斥被占用而保险库仍已解锁时下个周期再试; 没有设主密码的
 * 保险库不适用自动锁定; 其它情形不再重试.
 * @param reason 失败原因.
 * @param isStillUnlocked 失败之后保险库是否仍已解锁.
 * @returns 归类结果.
 */
function classifyFailure(
  reason: VaultFailureReason,
  isStillUnlocked: boolean,
): AutoLockAttemptOutcome {
  switch (reason) {
    case "tasks-running":
      return "deferred";
    case "master-password-required":
      return "not-applicable";
    case "unexpected-state":
      return isStillUnlocked ? "deferred" : "dropped";
    default:
      return "dropped";
  }
}

/**
 * 尝试自动锁定一次. 此前已被任务挡住的次数达到上限时忽略任务强制锁定; 锁定请求意外抛错按被挡住处理,
 * 下个周期再试, 不外泄错误.
 * @param vault 保险库.
 * @param deferredChecks 此前已被任务挡住的次数.
 * @returns 本次尝试的结果归类.
 */
export async function attemptAutoLock(
  vault: AutoLockVaultPort,
  deferredChecks: number,
): Promise<AutoLockAttemptOutcome> {
  const result = await vault
    .lock({ shouldIgnoreRunningTasks: shouldForceLock(deferredChecks) })
    .catch(() => undefined);
  if (result === undefined) {
    return "deferred";
  }
  return result.ok
    ? "locked"
    : classifyFailure(result.reason, vault.isUnlocked());
}
