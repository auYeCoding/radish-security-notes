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

describe("自动锁定控制: 空闲触发", () => {
  it("空闲未到时长不锁, 到时长 (恰好等于) 才经锁定入口锁定并通知原因", async () => {
    const rig = createAutoLockRig();
    rig.controller.start();

    rig.state.idleSeconds = 15 * 60 - 1;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);
    expect(rig.lock).not.toHaveBeenCalled();

    rig.state.idleSeconds = 15 * 60;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);

    expect(rig.lock).toHaveBeenCalledTimes(1);
    expect(rig.lock).toHaveBeenCalledWith({ shouldIgnoreRunningTasks: false });
    expect(rig.onLocked.mock.calls).toEqual([["idle"]]);
    rig.controller.stop();
  });

  it("时长按设置的分钟档位换算", async () => {
    const rig = createAutoLockRig({
      settings: { ...DEFAULT_AUTO_LOCK_SETTINGS, idleMinutes: 5 },
    });
    rig.controller.start();

    rig.state.idleSeconds = 299;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);
    expect(rig.lock).not.toHaveBeenCalled();

    rig.state.idleSeconds = 300;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);

    expect(rig.lock).toHaveBeenCalledTimes(1);
    rig.controller.stop();
  });
});

describe("自动锁定控制: 设置与操作对空闲触发的影响", () => {
  it("设置改动立即生效: 下一个周期按新的时长判断", async () => {
    const rig = createAutoLockRig();
    rig.controller.start();
    rig.state.idleSeconds = 120;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);
    expect(rig.lock).not.toHaveBeenCalled();

    rig.state.settings = { ...DEFAULT_AUTO_LOCK_SETTINGS, idleMinutes: 1 };
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);

    expect(rig.lock).toHaveBeenCalledTimes(1);
    rig.controller.stop();
  });

  it("有操作后空闲清零, 之后再空闲到时长才锁", async () => {
    const rig = createAutoLockRig();
    rig.controller.start();
    rig.state.idleSeconds = 14 * 60;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);

    rig.state.idleSeconds = 0;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);
    rig.state.idleSeconds = 14 * 60;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);
    expect(rig.lock).not.toHaveBeenCalled();

    rig.state.idleSeconds = 15 * 60;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);

    expect(rig.lock).toHaveBeenCalledTimes(1);
    rig.controller.stop();
  });

  it("空闲开关关闭时不锁", async () => {
    const rig = createAutoLockRig({
      settings: { ...DEFAULT_AUTO_LOCK_SETTINGS, isIdleLockEnabled: false },
    });
    rig.controller.start();

    rig.state.idleSeconds = 60 * 60;
    await vi.advanceTimersByTimeAsync(3 * RIG_CHECK_INTERVAL);

    expect(rig.lock).not.toHaveBeenCalled();
    rig.controller.stop();
  });
});

describe("自动锁定控制: 锁定后停止, 解锁后恢复", () => {
  it("锁定成功后不再尝试, 解锁后空闲再到时长重新锁定", async () => {
    const rig = createAutoLockRig();
    rig.controller.start();
    rig.state.idleSeconds = 15 * 60;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);
    expect(rig.lock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10 * RIG_CHECK_INTERVAL);
    expect(rig.lock).toHaveBeenCalledTimes(1);

    rig.state.isUnlocked = true;
    rig.state.idleSeconds = 0;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);
    rig.state.idleSeconds = 15 * 60;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);

    expect(rig.lock).toHaveBeenCalledTimes(2);
    expect(rig.onLocked).toHaveBeenCalledTimes(2);
    rig.controller.stop();
  });

  it("保险库一直没解锁时从不读空闲也不请求锁定", async () => {
    const rig = createAutoLockRig({ isUnlocked: false });
    rig.controller.start();

    rig.state.idleSeconds = 60 * 60;
    await vi.advanceTimersByTimeAsync(10 * RIG_CHECK_INTERVAL);

    expect(rig.lock).not.toHaveBeenCalled();
    rig.controller.stop();
  });

  it("解锁瞬间空闲已很长也会在下个周期锁定 (空闲由系统计算, 不重新计时)", async () => {
    const rig = createAutoLockRig({ isUnlocked: false });
    rig.controller.start();
    rig.state.idleSeconds = 60 * 60;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);

    rig.state.isUnlocked = true;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);

    expect(rig.lock).toHaveBeenCalledTimes(1);
    rig.controller.stop();
  });
});

describe("自动锁定控制: 未设主密码的保险库", () => {
  it("空闲触发只试一次, 持续空闲也不再重复读密钥文件", async () => {
    const rig = createAutoLockRig();
    rig.lock.mockResolvedValue(
      vaultOperationFailed("master-password-required"),
    );
    rig.controller.start();

    rig.state.idleSeconds = 15 * 60;
    await vi.advanceTimersByTimeAsync(20 * RIG_CHECK_INTERVAL);

    expect(rig.lock).toHaveBeenCalledTimes(1);
    expect(rig.onLocked).not.toHaveBeenCalled();
    rig.controller.stop();
  });

  it("用户有操作之后空闲再到时长, 才再试一次", async () => {
    const rig = createAutoLockRig();
    rig.lock.mockResolvedValue(
      vaultOperationFailed("master-password-required"),
    );
    rig.controller.start();
    rig.state.idleSeconds = 15 * 60;
    await vi.advanceTimersByTimeAsync(5 * RIG_CHECK_INTERVAL);
    expect(rig.lock).toHaveBeenCalledTimes(1);

    rig.state.idleSeconds = 0;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);
    rig.state.idleSeconds = 15 * 60;
    await vi.advanceTimersByTimeAsync(5 * RIG_CHECK_INTERVAL);

    expect(rig.lock).toHaveBeenCalledTimes(2);
    rig.controller.stop();
  });

  it("设置里开启主密码之后 (锁定入口不再拒绝) 下一次空闲就能锁", async () => {
    const rig = createAutoLockRig();
    rig.lock.mockResolvedValueOnce(
      vaultOperationFailed("master-password-required"),
    );
    rig.controller.start();
    rig.state.idleSeconds = 15 * 60;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);

    rig.state.idleSeconds = 0;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);
    rig.state.idleSeconds = 15 * 60;
    await vi.advanceTimersByTimeAsync(RIG_CHECK_INTERVAL);

    expect(rig.lock).toHaveBeenCalledTimes(2);
    expect(rig.onLocked.mock.calls).toEqual([["idle"]]);
    rig.controller.stop();
  });
});
