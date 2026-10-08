import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AutoBackupScheduler,
  AUTO_BACKUP_CHECK_INTERVAL_MILLISECONDS,
  AUTO_BACKUP_UNLOCK_PROBE_INTERVAL_MILLISECONDS,
  type ScheduledBackupPort,
} from "./auto-backup-scheduler";
import { SYSTEM_SCHEDULER_CLOCK } from "./scheduler-clock";

/**
 * 调度器与它的替身依赖.
 */
interface SchedulerHarness {
  /**
   * 被测调度器.
   */
  readonly scheduler: AutoBackupScheduler;
  /**
   * 替身的备份检查, 记下每次的触发方式.
   */
  readonly runScheduled: ReturnType<typeof vi.fn>;
  /**
   * 替身的失败回调.
   */
  readonly onFailure: ReturnType<typeof vi.fn>;
  /**
   * 保险库是否已解锁, 测试里改它来模拟解锁.
   */
  readonly lock: UnlockState;
}

/**
 * 假的解锁状态.
 */
interface UnlockState {
  /**
   * 保险库是否已解锁.
   */
  isUnlocked: boolean;
}

/**
 * 创建调度器, 时钟用系统定时器加 vitest 的假定时器, 不真等.
 * @param isUnlocked 开始时保险库是否已解锁.
 * @returns 调度器与替身依赖.
 */
function createHarness(isUnlocked: boolean): SchedulerHarness {
  const lock = { isUnlocked };
  const runScheduled = vi.fn(() =>
    Promise.resolve({ ok: true as const, value: undefined }),
  );
  const onFailure = vi.fn();
  const backup: ScheduledBackupPort = { runScheduled };
  const scheduler = new AutoBackupScheduler({
    clock: SYSTEM_SCHEDULER_CLOCK,
    isUnlocked: () => lock.isUnlocked,
    backup,
    onFailure,
  });
  return { scheduler, runScheduled, onFailure, lock };
}

/**
 * 五分钟检查的间隔.
 */
const CHECK = AUTO_BACKUP_CHECK_INTERVAL_MILLISECONDS;

/**
 * 解锁探测的间隔.
 */
const PROBE = AUTO_BACKUP_UNLOCK_PROBE_INTERVAL_MILLISECONDS;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("自动备份调度器: 已解锁", () => {
  it("启动时立即检查一次 (启动补发), 之后每五分钟检查一次", () => {
    const { scheduler, runScheduled } = createHarness(true);
    scheduler.start();
    expect(runScheduled.mock.calls).toEqual([["catch-up"]]);
    vi.advanceTimersByTime(CHECK);
    expect(runScheduled.mock.calls).toEqual([["catch-up"], ["scheduled"]]);
    vi.advanceTimersByTime(2 * CHECK);
    expect(runScheduled).toHaveBeenCalledTimes(4);
    scheduler.stop();
  });

  it("重复启动无效, 停止后不再检查", () => {
    const { scheduler, runScheduled } = createHarness(true);
    scheduler.start();
    scheduler.start();
    expect(runScheduled).toHaveBeenCalledTimes(1);
    scheduler.stop();
    vi.advanceTimersByTime(10 * CHECK);
    expect(runScheduled).toHaveBeenCalledTimes(1);
  });
});

describe("自动备份调度器: 未解锁", () => {
  it("解锁前每隔几秒探测, 不检查; 解锁后立即检查一次, 再每五分钟检查", () => {
    const { scheduler, runScheduled, lock } = createHarness(false);
    scheduler.start();
    vi.advanceTimersByTime(3 * PROBE);
    expect(runScheduled).not.toHaveBeenCalled();
    lock.isUnlocked = true;
    vi.advanceTimersByTime(PROBE);
    expect(runScheduled.mock.calls).toEqual([["catch-up"]]);
    vi.advanceTimersByTime(CHECK);
    expect(runScheduled.mock.calls).toEqual([["catch-up"], ["scheduled"]]);
    scheduler.stop();
  });

  it("解锁前停止则永远不检查", () => {
    const { scheduler, runScheduled, lock } = createHarness(false);
    scheduler.start();
    scheduler.stop();
    lock.isUnlocked = true;
    vi.advanceTimersByTime(10 * CHECK);
    expect(runScheduled).not.toHaveBeenCalled();
  });
});

describe("自动备份调度器: 锁定后暂停", () => {
  it("暂停后不再周期检查, 改为探测; 解锁后立即补发一次, 再每五分钟检查", () => {
    const { scheduler, runScheduled, lock } = createHarness(true);
    scheduler.start();
    lock.isUnlocked = false;
    scheduler.pauseUntilUnlocked();
    runScheduled.mockClear();

    vi.advanceTimersByTime(3 * CHECK);
    expect(runScheduled).not.toHaveBeenCalled();
    lock.isUnlocked = true;
    vi.advanceTimersByTime(PROBE);
    expect(runScheduled.mock.calls).toEqual([["catch-up"]]);
    vi.advanceTimersByTime(CHECK);
    expect(runScheduled.mock.calls).toEqual([["catch-up"], ["scheduled"]]);
    scheduler.stop();
  });

  it("可以反复暂停与恢复", () => {
    const { scheduler, runScheduled, lock } = createHarness(true);
    scheduler.start();
    for (let round = 0; round < 2; round += 1) {
      lock.isUnlocked = false;
      scheduler.pauseUntilUnlocked();
      lock.isUnlocked = true;
      vi.advanceTimersByTime(PROBE);
    }
    expect(runScheduled.mock.calls).toEqual([
      ["catch-up"],
      ["catch-up"],
      ["catch-up"],
    ]);
    scheduler.stop();
  });
});

describe("自动备份调度器: 暂停的边界", () => {
  it("已经在探测时再暂停不会重复登记探测", () => {
    const { scheduler, runScheduled, lock } = createHarness(false);
    scheduler.start();
    scheduler.pauseUntilUnlocked();
    lock.isUnlocked = true;
    vi.advanceTimersByTime(PROBE);
    expect(runScheduled.mock.calls).toEqual([["catch-up"]]);
    scheduler.stop();
  });

  it("还没启动或已停止时暂停无效", () => {
    const { scheduler, runScheduled, lock } = createHarness(true);
    scheduler.pauseUntilUnlocked();
    scheduler.start();
    scheduler.stop();
    scheduler.pauseUntilUnlocked();
    lock.isUnlocked = true;
    vi.advanceTimersByTime(10 * CHECK);
    expect(runScheduled).toHaveBeenCalledTimes(1);
  });
});

describe("自动备份调度器: 检查出错", () => {
  it("出错只通知回调, 不抛出, 下一次检查照常进行", async () => {
    const { scheduler, runScheduled, onFailure } = createHarness(true);
    const failure = new Error("boom");
    runScheduled.mockRejectedValueOnce(failure);
    scheduler.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(onFailure).toHaveBeenCalledWith(failure);
    await vi.advanceTimersByTimeAsync(CHECK);
    expect(runScheduled).toHaveBeenCalledTimes(2);
    expect(onFailure).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });
});
