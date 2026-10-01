/**
 * 保险库操作失败的原因.
 */
export type VaultFailureReason =
  | "password-too-short"
  | "wrong-password"
  | "system-protection-unavailable"
  | "unexpected-state"
  | "unexpected-error";

/**
 * 保险库操作成功的结果.
 */
export interface VaultOperationSuccess {
  /**
   * 操作是否成功, 成功时恒为 true.
   */
  readonly ok: true;
}

/**
 * 保险库操作失败的结果.
 */
export interface VaultOperationFailure {
  /**
   * 操作是否成功, 失败时恒为 false.
   */
  readonly ok: false;
  /**
   * 失败的原因.
   */
  readonly reason: VaultFailureReason;
}

/**
 * 保险库操作的结果: 成功, 或带原因的失败.
 */
export type VaultOperationResult =
  VaultOperationSuccess | VaultOperationFailure;

/**
 * 表示操作成功的结果.
 */
export const VAULT_OPERATION_SUCCEEDED: VaultOperationSuccess = { ok: true };

/**
 * 构造表示操作失败的结果.
 * @param reason 失败的原因.
 * @returns 带原因的失败结果.
 */
export function vaultOperationFailed(
  reason: VaultFailureReason,
): VaultOperationFailure {
  return { ok: false, reason };
}
