/**
 * 尝试执行一个动作, 抛出的错误被吞掉, 不通知任何回调, 也不写日志. 只用于失败原因不应外泄,
 * 且失败不改变后续流程的场合, 例如锁定时关闭数据库与释放内存里的状态.
 * @param action 要尝试的动作.
 * @returns 动作没有抛错为 true, 抛了错为 false.
 */
export function attemptSilently(action: () => void): boolean {
  try {
    action();
    return true;
  } catch {
    return false;
  }
}
