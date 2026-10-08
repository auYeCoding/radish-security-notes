import { attemptSilently } from "./attempt-silently";

/**
 * 锁定登记处: 各业务模块把 "有任务进行中" 的判断和 "锁定时要丢弃的内存状态" 登记在这里, 锁定流程
 * 只问登记处, 不认识任何具体业务. 新增长任务或敏感状态时登记即可, 不用改锁定流程.
 */
export interface LockRegistry {
  /**
   * 登记一个忙碌探测.
   * @param isBusy 有任务进行中时返回 true.
   */
  readonly addBusyProbe: (isBusy: () => boolean) => void;
  /**
   * 登记一个锁定时执行的释放动作.
   * @param release 丢弃该模块在内存里保存的解密状态.
   */
  readonly addReleaser: (release: () => void) => void;
  /**
   * 判断是否有已登记的任务正在进行.
   * @returns 任一探测报告忙碌时为 true.
   */
  readonly hasRunningTask: () => boolean;
  /**
   * 依次执行全部释放动作, 单个动作抛错不影响其余, 错误不外泄.
   */
  readonly releaseAll: () => void;
}

/**
 * 创建锁定登记处, 初始没有登记任何探测与释放动作.
 * @returns 锁定登记处.
 */
export function createLockRegistry(): LockRegistry {
  const busyProbes: Array<() => boolean> = [];
  const releasers: Array<() => void> = [];
  return {
    addBusyProbe: (isBusy) => {
      busyProbes.push(isBusy);
    },
    addReleaser: (release) => {
      releasers.push(release);
    },
    hasRunningTask: () => busyProbes.some((isBusy) => isBusy()),
    releaseAll: () => {
      releasers.forEach((release) => attemptSilently(release));
    },
  };
}
