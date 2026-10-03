/**
 * 文件夹操作失败的原因.
 */
export type FolderFailureReason =
  | "vault-locked"
  | "invalid-input"
  | "not-found"
  | "name-taken"
  | "unexpected-error";

/**
 * 文件夹操作成功的结果.
 */
export interface FolderSuccess<Value> {
  /**
   * 操作是否成功, 成功时恒为 true.
   */
  readonly ok: true;
  /**
   * 操作产生的值.
   */
  readonly value: Value;
}

/**
 * 文件夹操作失败的结果.
 */
export interface FolderFailure {
  /**
   * 操作是否成功, 失败时恒为 false.
   */
  readonly ok: false;
  /**
   * 失败的原因.
   */
  readonly reason: FolderFailureReason;
}

/**
 * 文件夹操作的结果: 带值的成功, 或带原因的失败.
 */
export type FolderResult<Value> = FolderSuccess<Value> | FolderFailure;

/**
 * 构造表示操作成功的结果.
 * @param value 操作产生的值.
 * @returns 带值的成功结果.
 */
export function folderSucceeded<Value>(value: Value): FolderSuccess<Value> {
  return { ok: true, value };
}

/**
 * 构造表示操作失败的结果.
 * @param reason 失败的原因.
 * @returns 带原因的失败结果.
 */
export function folderFailed(reason: FolderFailureReason): FolderFailure {
  return { ok: false, reason };
}
