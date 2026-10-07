/**
 * 一个由测试手动兑现的承诺.
 */
export interface Deferred<Value> {
  /**
   * 交给被测代码等待的承诺.
   */
  readonly promise: Promise<Value>;
  /**
   * 兑现承诺.
   */
  readonly resolve: (value: Value) => void;
}

/**
 * 创建一个由测试手动兑现的承诺, 用来让桥方法停在执行中, 检查执行中的界面.
 * @returns 承诺与兑现它的方法.
 */
export function createDeferred<Value>(): Deferred<Value> {
  let resolve: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
