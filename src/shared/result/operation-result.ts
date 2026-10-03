/**
 * 操作成功的结果.
 */
export interface OperationSuccess<Value> {
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
 * 操作失败的结果.
 */
export interface OperationFailure<Reason extends string> {
  /**
   * 操作是否成功, 失败时恒为 false.
   */
  readonly ok: false;
  /**
   * 失败的原因.
   */
  readonly reason: Reason;
}

/**
 * 操作的结果: 带值的成功, 或带原因的失败.
 */
export type OperationResult<Value, Reason extends string> =
  OperationSuccess<Value> | OperationFailure<Reason>;

/**
 * 构造表示操作成功的结果.
 * @param value 操作产生的值.
 * @returns 带值的成功结果.
 */
export function operationSucceeded<Value>(
  value: Value,
): OperationSuccess<Value> {
  return { ok: true, value };
}

/**
 * 构造表示操作失败的结果.
 * @param reason 失败的原因.
 * @returns 带原因的失败结果.
 */
export function operationFailed<Reason extends string>(
  reason: Reason,
): OperationFailure<Reason> {
  return { ok: false, reason };
}
