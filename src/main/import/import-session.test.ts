import { describe, expect, it, vi } from "vitest";

import {
  ImportSession,
  scheduleWithTimeout,
  type PendingImport,
} from "./import-session";

/**
 * 一个等待确认的导入样例.
 */
const PENDING: PendingImport = {
  plan: {
    sourceKey: "bitwardenJson",
    totalEntryCount: 0,
    entries: [],
    skippedEntryCount: 0,
    notImported: [],
  },
  duplicateIndexes: new Set(),
  sourcePath: "C:/a.json",
};

/**
 * 把超时回调记下来的假计时环境.
 */
interface FakeTimerSession {
  /**
   * 被测会话.
   */
  readonly session: ImportSession;
  /**
   * 登记过的超时回调.
   */
  readonly callbacks: (() => void)[];
  /**
   * 取消计时的间谍.
   */
  readonly cancel: ReturnType<typeof vi.fn>;
}

/**
 * 建一个把超时回调记下来的会话.
 * @returns 会话, 超时回调列表, 取消计时的间谍.
 */
function sessionWithFakeTimer(): FakeTimerSession {
  const callbacks: (() => void)[] = [];
  const cancel = vi.fn();
  const session = new ImportSession({
    lifetimeMilliseconds: 1000,
    scheduleExpiry: (callback) => {
      callbacks.push(callback);
      return cancel;
    },
  });
  return { session, callbacks, cancel };
}

describe("导入会话: 等待确认的导入", () => {
  it("保存后能读到, 释放后读不到并取消计时", () => {
    const { session, cancel } = sessionWithFakeTimer();
    session.hold(PENDING);
    expect(session.peekPending()).toBe(PENDING);
    session.releasePending();
    expect(session.peekPending()).toBeUndefined();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("超时回调执行后自动释放", () => {
    const { session, callbacks } = sessionWithFakeTimer();
    session.hold(PENDING);
    callbacks[0]();
    expect(session.peekPending()).toBeUndefined();
  });

  it("再次保存会替换并取消上一次的计时", () => {
    const { session, cancel } = sessionWithFakeTimer();
    session.hold(PENDING);
    session.hold({ ...PENDING, sourcePath: "C:/b.json" });
    expect(session.peekPending()?.sourcePath).toBe("C:/b.json");
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});

describe("导入会话: 保留的信息与计时", () => {
  it("结束后保留的信息在清空前一直可读", () => {
    const { session } = sessionWithFakeTimer();
    session.retain({ sourcePath: "C:/a.json", notImported: [] });
    session.releasePending();
    expect(session.retained()?.sourcePath).toBe("C:/a.json");
    session.clear();
    expect(session.retained()).toBeUndefined();
  });

  it("基于 setTimeout 的计时到时执行回调, 取消后不再执行", () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    scheduleWithTimeout(callback, 500);
    vi.advanceTimersByTime(499);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    const cancelled = vi.fn();
    scheduleWithTimeout(cancelled, 500)();
    vi.advanceTimersByTime(1000);
    expect(cancelled).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
