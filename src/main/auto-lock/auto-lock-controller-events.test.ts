import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_AUTO_LOCK_SETTINGS } from "@shared/preferences/auto-lock-settings";
import { vaultOperationFailed } from "@shared/vault/vault-operation-result";

import {
  RIG_CHECK_INTERVAL,
  createAutoLockRig,
} from "../testing/auto-lock-controller-rig";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("自动锁定控制: 锁屏与休眠触发", () => {
  it("系统锁屏时立即经锁定入口锁定, 不必等下个周期, 原因是 screen-lock", async () => {
    const rig = createAutoLockRig();
    rig.controller.start();

    rig.fireScreenLock();
    await vi.advanceTimersByTimeAsync(0);

    expect(rig.lock).toHaveBeenCalledTimes(1);
    expect(rig.lock).toHaveBeenCalledWith({ shouldIgnoreRunningTasks: false });
    expect(rig.onLocked.mock.calls).toEqual([["screen-lock"]]);
    rig.controller.stop();
  });

  it("系统休眠时立即锁定, 原因是 sleep", async () => {
    const rig = createAutoLockRig();
    rig.controller.start();

    rig.fireSuspend();
    await vi.advanceTimersByTimeAsync(0);

    expect(rig.onLocked.mock.calls).toEqual([["sleep"]]);
    rig.controller.stop();
  });

  it("锁屏与休眠不看空闲秒数, 刚有过操作也锁", async () => {
    const rig = createAutoLockRig();
    rig.controller.start();
    rig.state.idleSeconds = 0;

    rig.fireScreenLock();
    await vi.advanceTimersByTimeAsync(0);

    expect(rig.lock).toHaveBeenCalledTimes(1);
    rig.controller.stop();
  });
});

describe("自动锁定控制: 锁屏与休眠触发的开关与前提", () => {
  it("对应的开关关闭时忽略该事件, 另一个事件不受影响", async () => {
    const rig = createAutoLockRig({
      settings: { ...DEFAULT_AUTO_LOCK_SETTINGS, isScreenLockEnabled: false },
    });
    rig.controller.start();

    rig.fireScreenLock();
    await vi.advanceTimersByTimeAsync(0);
    expect(rig.lock).not.toHaveBeenCalled();

    rig.fireSuspend();
    await vi.advanceTimersByTimeAsync(0);
    expect(rig.onLocked.mock.calls).toEqual([["sleep"]]);
    rig.controller.stop();
  });

  it("休眠开关关闭时忽略休眠事件", async () => {
    const rig = createAutoLockRig({
      settings: { ...DEFAULT_AUTO_LOCK_SETTINGS, isSleepLockEnabled: false },
    });
    rig.controller.start();

    rig.fireSuspend();
    await vi.advanceTimersByTimeAsync(0);

    expect(rig.lock).not.toHaveBeenCalled();
    rig.controller.stop();
  });

  it("保险库未解锁时忽略事件", async () => {
    const rig = createAutoLockRig({ isUnlocked: false });
    rig.controller.start();

    rig.fireScreenLock();
    rig.fireSuspend();
    await vi.advanceTimersByTimeAsync(0);

    expect(rig.lock).not.toHaveBeenCalled();
    rig.controller.stop();
  });

  it("未设主密码时事件触发被拒绝则放弃, 不留待锁定, 也不抑制之后的空闲触发", async () => {
    const rig = createAutoLockRig();
    rig.lock.mockResolvedValueOnce(
      vaultOperationFailed("master-password-required"),
    );
    rig.controller.start();

    rig.fireScreenLock();
    await vi.advanceTimersByTimeAsync(5 * RIG_CHECK_INTERVAL);
    expect(rig.lock).toHaveBeenCalledTimes(1);

    rig.state.idleSeconds = 15 * 60;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);

    expect(rig.lock).toHaveBeenCalledTimes(2);
    expect(rig.onLocked.mock.calls).toEqual([["idle"]]);
    rig.controller.stop();
  });
});

describe("自动锁定控制: 启动与停止", () => {
  it("重复启动无效, 事件只订阅一次", () => {
    const rig = createAutoLockRig();

    rig.controller.start();
    rig.controller.start();

    expect(rig.subscriptionCounts()).toEqual({ screenLock: 1, suspend: 1 });
    rig.controller.stop();
  });

  it("停止后取消订阅与周期检查, 事件和空闲都不再触发", async () => {
    const rig = createAutoLockRig();
    rig.controller.start();
    rig.controller.stop();

    rig.fireScreenLock();
    rig.fireSuspend();
    rig.state.idleSeconds = 60 * 60;
    await vi.advanceTimersByTimeAsync(10 * RIG_CHECK_INTERVAL);

    expect(rig.subscriptionCounts()).toEqual({ screenLock: 0, suspend: 0 });
    expect(rig.lock).not.toHaveBeenCalled();
  });

  it("停止后可以再次启动", async () => {
    const rig = createAutoLockRig();
    rig.controller.start();
    rig.controller.stop();
    rig.controller.start();

    rig.fireSuspend();
    await vi.advanceTimersByTimeAsync(0);

    expect(rig.lock).toHaveBeenCalledTimes(1);
    rig.controller.stop();
  });
});

describe("自动锁定控制: 出错时的稳健性", () => {
  it("读取设置抛错时这个周期和这个事件什么也不做, 恢复后照常工作", async () => {
    const rig = createAutoLockRig();
    rig.controller.start();
    rig.state.shouldFailReadingSettings = true;
    rig.state.idleSeconds = 15 * 60;

    rig.fireScreenLock();
    await vi.advanceTimersByTimeAsync(3 * RIG_CHECK_INTERVAL);
    expect(rig.lock).not.toHaveBeenCalled();

    rig.state.shouldFailReadingSettings = false;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);

    expect(rig.lock).toHaveBeenCalledTimes(1);
    rig.controller.stop();
  });

  it("成功后的通知回调抛错不外泄, 也不留下待锁定", async () => {
    const rig = createAutoLockRig();
    rig.onLocked.mockImplementation(() => {
      throw new Error("推送失败");
    });
    rig.controller.start();

    rig.fireSuspend();
    await vi.advanceTimersByTimeAsync(5 * RIG_CHECK_INTERVAL);

    expect(rig.lock).toHaveBeenCalledTimes(1);
    rig.controller.stop();
  });
});
