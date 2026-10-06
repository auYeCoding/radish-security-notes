/**
 * 调度器用的时钟端口: 按固定间隔重复执行任务. 测试里换成手动推进的假时钟, 不真等.
 */
export interface SchedulerClock {
  /**
   * 每隔一段时间执行一次任务, 第一次在一个间隔之后.
   * @param task 要重复执行的任务.
   * @param intervalMilliseconds 间隔的毫秒数.
   * @returns 取消重复执行的函数.
   */
  readonly every: (
    task: () => void,
    intervalMilliseconds: number,
  ) => () => void;
}

/**
 * 基于系统定时器的时钟, 休眠唤醒后定时器继续按周期触发.
 */
export const SYSTEM_SCHEDULER_CLOCK: SchedulerClock = {
  every: (task, intervalMilliseconds) => {
    const handle = setInterval(task, intervalMilliseconds);
    return () => clearInterval(handle);
  },
};
