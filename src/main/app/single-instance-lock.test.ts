import { describe, expect, it, vi, type Mock } from "vitest";

import {
  claimPrimaryInstance,
  type SingleInstanceAppPort,
} from "./single-instance-lock";

/**
 * 假的应用对象与它的间谍函数.
 */
interface FakeApp {
  /**
   * 交给被测函数的假应用.
   */
  readonly app: SingleInstanceAppPort;
  /**
   * 请求单实例锁的间谍.
   */
  readonly requestSingleInstanceLock: Mock<() => boolean>;
  /**
   * 请求退出的间谍.
   */
  readonly quit: Mock<() => void>;
}

/**
 * 创建假的应用对象.
 * @param isLockAvailable 请求单实例锁时能否拿到.
 * @returns 假应用与它的间谍函数.
 */
function createFakeApp(isLockAvailable: boolean): FakeApp {
  const requestSingleInstanceLock = vi.fn(() => isLockAvailable);
  const quit = vi.fn();
  return {
    app: { requestSingleInstanceLock, quit },
    requestSingleInstanceLock,
    quit,
  };
}

describe("claimPrimaryInstance", () => {
  it("拿到锁时是主实例, 不退出", () => {
    const { app, requestSingleInstanceLock, quit } = createFakeApp(true);

    expect(claimPrimaryInstance(app)).toBe(true);
    expect(requestSingleInstanceLock).toHaveBeenCalledOnce();
    expect(quit).not.toHaveBeenCalled();
  });

  it("拿不到锁时不是主实例, 请求退出一次", () => {
    const { app, requestSingleInstanceLock, quit } = createFakeApp(false);

    expect(claimPrimaryInstance(app)).toBe(false);
    expect(requestSingleInstanceLock).toHaveBeenCalledOnce();
    expect(quit).toHaveBeenCalledOnce();
  });

  it("先请求锁, 拿不到才退出", () => {
    const { app, requestSingleInstanceLock, quit } = createFakeApp(false);

    claimPrimaryInstance(app);

    expect(requestSingleInstanceLock.mock.invocationCallOrder[0]).toBeLessThan(
      quit.mock.invocationCallOrder[0],
    );
  });
});
