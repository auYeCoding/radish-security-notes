import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_AUTO_LOCK_SETTINGS } from "@shared/preferences/auto-lock-settings";
import {
  VAULT_OPERATION_SUCCEEDED,
  vaultOperationFailed,
  type VaultOperationResult,
} from "@shared/vault/vault-operation-result";

import {
  RIG_CHECK_INTERVAL,
  createAutoLockRig,
  type AutoLockRig,
} from "../testing/auto-lock-controller-rig";
import { AUTO_LOCK_DEFERRAL_LIMIT_CHECKS } from "./auto-lock-timing";

/**
 * 让假锁定入口一直被进行中的任务挡住, 直到调用方改回成功.
 * @param rig 控制与假依赖.
 * @param isBlocked 返回 true 时锁定被任务挡住.
 */
function blockWhile(rig: AutoLockRig, isBlocked: () => boolean): void {
  rig.lock.mockImplementation(() => {
    if (isBlocked()) {
      return Promise.resolve(vaultOperationFailed("tasks-running"));
    }
    rig.state.isUnlocked = false;
    return Promise.resolve(VAULT_OPERATION_SUCCEEDED);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("自动锁定控制: 被进行中的任务挡住", () => {
  it("空闲触发被挡住后每个周期重试, 任务一结束就锁, 只通知一次", async () => {
    const rig = createAutoLockRig();
    let isBusy = true;
    blockWhile(rig, () => isBusy);
    rig.controller.start();
    rig.state.idleSeconds = 15 * 60;

    await vi.advanceTimersByTimeAsync(4 * RIG_CHECK_INTERVAL);
    expect(rig.lock).toHaveBeenCalledTimes(4);
    expect(rig.onLocked).not.toHaveBeenCalled();

    isBusy = false;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);

    expect(rig.lock).toHaveBeenCalledTimes(5);
    expect(rig.onLocked.mock.calls).toEqual([["idle"]]);
    await vi.advanceTimersByTimeAsync(5 * RIG_CHECK_INTERVAL);
    expect(rig.lock).toHaveBeenCalledTimes(5);
    rig.controller.stop();
  });

  it("锁屏事件被挡住后保持原因, 任务结束后以 screen-lock 通知", async () => {
    const rig = createAutoLockRig();
    let isBusy = true;
    blockWhile(rig, () => isBusy);
    rig.controller.start();

    rig.fireScreenLock();
    await vi.advanceTimersByTimeAsync(2 * RIG_CHECK_INTERVAL);
    isBusy = false;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);

    expect(rig.onLocked.mock.calls).toEqual([["screen-lock"]]);
    rig.controller.stop();
  });
});

describe("自动锁定控制: 推迟的上限", () => {
  it("推迟满上限之前一直不强制, 满上限的那一次才带忽略任务的选项", async () => {
    const rig = createAutoLockRig();
    blockWhile(rig, () => true);
    rig.controller.start();

    rig.fireSuspend();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(
      AUTO_LOCK_DEFERRAL_LIMIT_CHECKS * RIG_CHECK_INTERVAL,
    );

    const options = rig.lock.mock.calls.map(([option]) => option);
    expect(options).toHaveLength(AUTO_LOCK_DEFERRAL_LIMIT_CHECKS + 1);
    expect(
      options
        .slice(0, AUTO_LOCK_DEFERRAL_LIMIT_CHECKS)
        .every((option) => option.shouldIgnoreRunningTasks === false),
    ).toBe(true);
    expect(options.at(-1)).toEqual({ shouldIgnoreRunningTasks: true });
    rig.controller.stop();
  });

  it("推迟的上限是两分钟: 事件后 120 秒的那次尝试强制锁定并通知", async () => {
    const rig = createAutoLockRig();
    rig.lock.mockImplementation((options) => {
      if (options.shouldIgnoreRunningTasks) {
        rig.state.isUnlocked = false;
        return Promise.resolve(VAULT_OPERATION_SUCCEEDED);
      }
      return Promise.resolve(vaultOperationFailed("tasks-running"));
    });
    rig.controller.start();

    rig.fireScreenLock();
    await vi.advanceTimersByTimeAsync(119 * 1000);
    expect(rig.onLocked).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);

    expect(rig.onLocked.mock.calls).toEqual([["screen-lock"]]);
    rig.controller.stop();
  });
});

describe("自动锁定控制: 待锁定的取消与保留", () => {
  it("空闲的待锁定在用户回来 (空闲降到阈值以下) 后取消, 不再重试", async () => {
    const rig = createAutoLockRig();
    blockWhile(rig, () => true);
    rig.controller.start();
    rig.state.idleSeconds = 15 * 60;
    await vi.advanceTimersByTimeAsync(3 * RIG_CHECK_INTERVAL);
    expect(rig.lock).toHaveBeenCalledTimes(3);

    rig.state.idleSeconds = 2;
    await vi.advanceTimersByTimeAsync(10 * RIG_CHECK_INTERVAL);

    expect(rig.lock).toHaveBeenCalledTimes(3);
    rig.controller.stop();
  });

  it("锁屏的待锁定不因用户回来而取消, 仍在任务结束后锁定", async () => {
    const rig = createAutoLockRig();
    let isBusy = true;
    blockWhile(rig, () => isBusy);
    rig.controller.start();
    rig.fireScreenLock();
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);

    rig.state.idleSeconds = 0;
    await vi.advanceTimersByTimeAsync(3 * RIG_CHECK_INTERVAL);
    isBusy = false;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);

    expect(rig.onLocked.mock.calls).toEqual([["screen-lock"]]);
    rig.controller.stop();
  });

  it("推迟期间对应的开关被关掉则取消待锁定", async () => {
    const rig = createAutoLockRig();
    blockWhile(rig, () => true);
    rig.controller.start();
    rig.fireSuspend();
    await vi.advanceTimersByTimeAsync(2 * RIG_CHECK_INTERVAL);
    const callsBefore = rig.lock.mock.calls.length;

    rig.state.settings = {
      ...DEFAULT_AUTO_LOCK_SETTINGS,
      isSleepLockEnabled: false,
    };
    await vi.advanceTimersByTimeAsync(5 * RIG_CHECK_INTERVAL);

    expect(rig.lock).toHaveBeenCalledTimes(callsBefore);
    rig.controller.stop();
  });
});

describe("自动锁定控制: 其它失败原因的处理", () => {
  it("互斥被占用 (状态不符但仍已解锁) 时下个周期重试", async () => {
    const rig = createAutoLockRig();
    rig.lock.mockResolvedValueOnce(vaultOperationFailed("unexpected-state"));
    rig.controller.start();

    rig.fireScreenLock();
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);

    expect(rig.lock).toHaveBeenCalledTimes(2);
    expect(rig.onLocked.mock.calls).toEqual([["screen-lock"]]);
    rig.controller.stop();
  });

  it("状态不符且保险库已不是解锁状态 (已被别处锁定) 时放弃, 不通知", async () => {
    const rig = createAutoLockRig();
    rig.lock.mockImplementation(() => {
      rig.state.isUnlocked = false;
      return Promise.resolve(vaultOperationFailed("unexpected-state"));
    });
    rig.controller.start();

    rig.fireScreenLock();
    await vi.advanceTimersByTimeAsync(5 * RIG_CHECK_INTERVAL);

    expect(rig.lock).toHaveBeenCalledTimes(1);
    expect(rig.onLocked).not.toHaveBeenCalled();
    rig.controller.stop();
  });
});

describe("自动锁定控制: 无法判断的失败", () => {
  it("其它失败原因放弃, 不无限重试", async () => {
    const rig = createAutoLockRig();
    rig.lock.mockResolvedValue(vaultOperationFailed("unexpected-error"));
    rig.controller.start();

    rig.fireScreenLock();
    await vi.advanceTimersByTimeAsync(5 * RIG_CHECK_INTERVAL);

    expect(rig.lock).toHaveBeenCalledTimes(1);
    rig.controller.stop();
  });

  it("锁定请求意外抛错按被挡住处理, 下个周期重试, 错误不外泄", async () => {
    const rig = createAutoLockRig();
    rig.lock.mockRejectedValueOnce(new Error("意外"));
    rig.controller.start();

    rig.fireSuspend();
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);

    expect(rig.lock).toHaveBeenCalledTimes(2);
    expect(rig.onLocked.mock.calls).toEqual([["sleep"]]);
    rig.controller.stop();
  });
});

describe("自动锁定控制: 同一时刻只有一个尝试", () => {
  it("尝试还没返回时周期到了与新事件到了都不再发起锁定", async () => {
    const rig = createAutoLockRig();
    let finish: (result: VaultOperationResult) => void = () => undefined;
    rig.lock.mockImplementation(
      () =>
        new Promise<VaultOperationResult>((resolve) => {
          finish = resolve;
        }),
    );
    rig.controller.start();
    rig.state.idleSeconds = 15 * 60;

    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);
    await vi.advanceTimersByTimeAsync(3 * RIG_CHECK_INTERVAL);
    rig.fireScreenLock();
    rig.fireSuspend();
    await vi.advanceTimersByTimeAsync(0);

    expect(rig.lock).toHaveBeenCalledTimes(1);
    rig.state.isUnlocked = false;
    finish(VAULT_OPERATION_SUCCEEDED);
    await vi.advanceTimersByTimeAsync(0);
    expect(rig.onLocked.mock.calls).toEqual([["idle"]]);
    rig.controller.stop();
  });

  it("已有待锁定时重复的事件不产生第二个", async () => {
    const rig = createAutoLockRig();
    blockWhile(rig, () => true);
    rig.controller.start();

    rig.fireScreenLock();
    rig.fireScreenLock();
    await vi.advanceTimersByTimeAsync(0);

    expect(rig.lock).toHaveBeenCalledTimes(1);
    rig.controller.stop();
  });
});
