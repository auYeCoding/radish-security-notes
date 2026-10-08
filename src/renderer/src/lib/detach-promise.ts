/**
 * 放手不管一个承诺: 调用方不等它完成, 也不处理它的结果, 它被拒绝时也不产生未处理的拒绝. 用于
 * 经桥发给主进程的 "发出即可" 的请求, 例如保存偏好, 窗口控制按钮, 取消进行中的任务, 轮询进度:
 * 失败时界面保持原状, 下一次操作或下一次轮询自然重试. 需要把失败反映到界面上的调用不要用它.
 * @param promise 要放手不管的承诺.
 */
export function detachPromise(promise: Promise<unknown>): void {
  promise.catch(() => undefined);
}
