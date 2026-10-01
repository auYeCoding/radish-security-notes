/**
 * 条目操作失败的原因.
 */
export type EntryFailureReason =
  "vault-locked" | "invalid-input" | "not-found" | "unexpected-error";

/**
 * 条目操作成功的结果.
 */
export interface EntrySuccess<Value> {
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
 * 条目操作失败的结果.
 */
export interface EntryFailure {
  /**
   * 操作是否成功, 失败时恒为 false.
   */
  readonly ok: false;
  /**
   * 失败的原因.
   */
  readonly reason: EntryFailureReason;
}

/**
 * 条目操作的结果: 带值的成功, 或带原因的失败.
 */
export type EntryResult<Value> = EntrySuccess<Value> | EntryFailure;

/**
 * 构造表示操作成功的结果.
 * @param value 操作产生的值.
 * @returns 带值的成功结果.
 */
export function entrySucceeded<Value>(value: Value): EntrySuccess<Value> {
  return { ok: true, value };
}

/**
 * 构造表示操作失败的结果.
 * @param reason 失败的原因.
 * @returns 带原因的失败结果.
 */
export function entryFailed(reason: EntryFailureReason): EntryFailure {
  return { ok: false, reason };
}
