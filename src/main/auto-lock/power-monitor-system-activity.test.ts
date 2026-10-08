import { EventEmitter } from "node:events";

import { describe, expect, it, vi } from "vitest";

import {
  createPowerMonitorActivity,
  type PowerMonitorPort,
} from "./power-monitor-system-activity";

/**
 * 假的系统电源监视: 用事件发射器模拟事件, 空闲秒数可调.
 */
class FakePowerMonitor extends EventEmitter implements PowerMonitorPort {
  /**
   * 假的空闲秒数.
   */
  idleSeconds: number | "throw" = 0;

  /**
   * 读取空闲秒数, 设为 "throw" 时抛错.
   * @returns 空闲的秒数.
   */
  getSystemIdleTime(): number {
    if (this.idleSeconds === "throw") {
      throw new Error("读取失败");
    }
    return this.idleSeconds;
  }
}

describe("createPowerMonitorActivity: 空闲秒数", () => {
  it("原样返回系统的空闲秒数", () => {
    const monitor = new FakePowerMonitor();
    monitor.idleSeconds = 321;

    expect(createPowerMonitorActivity(monitor).getIdleSeconds()).toBe(321);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -5])(
    "读到不合法的数 %s 时按 0 处理",
    (seconds) => {
      const monitor = new FakePowerMonitor();
      monitor.idleSeconds = seconds;

      expect(createPowerMonitorActivity(monitor).getIdleSeconds()).toBe(0);
    },
  );

  it("读取抛错时按 0 处理, 不外泄", () => {
    const monitor = new FakePowerMonitor();
    monitor.idleSeconds = "throw";

    expect(createPowerMonitorActivity(monitor).getIdleSeconds()).toBe(0);
  });
});

describe("createPowerMonitorActivity: 事件订阅", () => {
  it("锁屏与休眠分别订阅对应事件, 事件发生时调用监听函数", () => {
    const monitor = new FakePowerMonitor();
    const activity = createPowerMonitorActivity(monitor);
    const onScreenLock = vi.fn();
    const onSuspend = vi.fn();
    activity.onScreenLock(onScreenLock);
    activity.onSuspend(onSuspend);

    monitor.emit("lock-screen");
    expect(onScreenLock).toHaveBeenCalledTimes(1);
    expect(onSuspend).not.toHaveBeenCalled();

    monitor.emit("suspend");
    expect(onSuspend).toHaveBeenCalledTimes(1);
  });

  it("取消订阅后不再调用监听函数", () => {
    const monitor = new FakePowerMonitor();
    const activity = createPowerMonitorActivity(monitor);
    const listener = vi.fn();
    const unsubscribe = activity.onScreenLock(listener);

    unsubscribe();
    monitor.emit("lock-screen");

    expect(listener).not.toHaveBeenCalled();
    expect(monitor.listenerCount("lock-screen")).toBe(0);
  });

  it("订阅抛错时不外泄, 返回什么也不做的取消函数", () => {
    const monitor = new FakePowerMonitor();
    monitor.on = (): never => {
      throw new Error("订阅失败");
    };
    const activity = createPowerMonitorActivity(monitor);

    const unsubscribe = activity.onSuspend(vi.fn());

    expect(() => unsubscribe()).not.toThrow();
  });

  it("取消订阅抛错时不外泄", () => {
    const monitor = new FakePowerMonitor();
    monitor.removeListener = (): never => {
      throw new Error("取消失败");
    };
    const unsubscribe = createPowerMonitorActivity(monitor).onScreenLock(
      vi.fn(),
    );

    expect(() => unsubscribe()).not.toThrow();
  });
});
