import { describe, expect, it, vi } from "vitest";

import type { ScheduleExpiry } from "../import/import-session";
import type { ValidatedBackup } from "./restore-backup-types";
import {
  RestoreSession,
  type PendingBackup,
  type SelectedBackup,
} from "./restore-session";

/**
 * 登记过的一个超时回调.
 */
interface ScheduledCallback {
  /**
   * 到时要执行的回调.
   */
  readonly callback: () => void;
  /**
   * 登记的延时毫秒数.
   */
  readonly delay: number;
}

/**
 * 假的计时: 只记下登记的回调, 由测试决定何时触发.
 */
interface FakeTimer {
  /**
   * 登记延时回调的函数.
   */
  readonly schedule: ScheduleExpiry;
  /**
   * 登记过的回调.
   */
  readonly scheduled: ScheduledCallback[];
  /**
   * 取消回调被调用的次数.
   */
  readonly cancelCount: () => number;
}

/**
 * 创建假的计时.
 * @returns 假计时.
 */
function createFakeTimer(): FakeTimer {
  const scheduled: ScheduledCallback[] = [];
  let cancelled = 0;
  const schedule: ScheduleExpiry = (callback, delay) => {
    scheduled.push({ callback, delay });
    return () => {
      cancelled += 1;
    };
  };
  return { schedule, scheduled, cancelCount: () => cancelled };
}

/**
 * 创建带假计时的会话, 延时固定 600 毫秒.
 * @param timer 假计时.
 * @returns 恢复会话.
 */
function sessionWith(timer: FakeTimer): RestoreSession {
  return new RestoreSession({
    lifetimeMilliseconds: 600,
    scheduleExpiry: timer.schedule,
  });
}

/**
 * 一个已选定文件的内容.
 */
const SELECTED: SelectedBackup = {
  kind: "selected",
  filePath: "C:\\backup.age",
  fileSizeBytes: 10,
};

/**
 * 一个等待确认的内容, 备份本身对会话的行为没有影响.
 */
const PENDING: PendingBackup = {
  kind: "pending",
  backup: {} as ValidatedBackup,
  isEncrypted: false,
};

describe("恢复会话: 保存与超时", () => {
  it("保存内容并开始计时, 读取不释放", () => {
    const timer = createFakeTimer();
    const session = sessionWith(timer);

    session.hold(SELECTED);

    expect(session.peek()).toBe(SELECTED);
    expect(session.peek()).toBe(SELECTED);
    expect(timer.scheduled.map((item) => item.delay)).toEqual([600]);
  });

  it("到时自动释放", () => {
    const timer = createFakeTimer();
    const session = sessionWith(timer);
    session.hold(PENDING);

    timer.scheduled[0]?.callback();

    expect(session.peek()).toBeUndefined();
  });
});

describe("恢复会话: 替换与释放", () => {
  it("保存新内容时替换并释放旧的, 旧的计时被取消", () => {
    const timer = createFakeTimer();
    const session = sessionWith(timer);
    session.hold(SELECTED);

    session.hold(PENDING);

    expect(session.peek()).toBe(PENDING);
    expect(timer.cancelCount()).toBe(1);
    expect(timer.scheduled).toHaveLength(2);
  });

  it("释放清空内容并取消计时, 重复释放无害, 没有内容时读取是 undefined", () => {
    const timer = createFakeTimer();
    const session = sessionWith(timer);
    expect(session.peek()).toBeUndefined();
    session.hold(PENDING);

    session.release();
    session.release();

    expect(session.peek()).toBeUndefined();
    expect(timer.cancelCount()).toBe(1);
  });
});

describe("恢复会话: 依赖的登记函数", () => {
  it("每次保存都向登记函数要一个新的计时", () => {
    const schedule = vi.fn<ScheduleExpiry>(() => () => undefined);
    const session = new RestoreSession({
      lifetimeMilliseconds: 1,
      scheduleExpiry: schedule,
    });

    session.hold(SELECTED);
    session.hold(PENDING);

    expect(schedule).toHaveBeenCalledTimes(2);
  });
});
