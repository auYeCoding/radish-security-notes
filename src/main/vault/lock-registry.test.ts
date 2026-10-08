import { describe, expect, it, vi } from "vitest";

import { createLockRegistry } from "./lock-registry";

describe("createLockRegistry", () => {
  it("没有登记任何探测时没有任务进行中", () => {
    expect(createLockRegistry().hasRunningTask()).toBe(false);
  });

  it("任一探测报告忙碌就有任务进行中", () => {
    const registry = createLockRegistry();
    registry.addBusyProbe(() => false);
    registry.addBusyProbe(() => true);

    expect(registry.hasRunningTask()).toBe(true);
  });

  it("全部探测都不忙碌时没有任务进行中", () => {
    const registry = createLockRegistry();
    registry.addBusyProbe(() => false);
    registry.addBusyProbe(() => false);

    expect(registry.hasRunningTask()).toBe(false);
  });

  it("探测每次调用时才求值, 不缓存结果", () => {
    const registry = createLockRegistry();
    let isBusy = false;
    registry.addBusyProbe(() => isBusy);
    isBusy = true;

    expect(registry.hasRunningTask()).toBe(true);
  });

  it("释放全部动作, 按登记顺序执行", () => {
    const registry = createLockRegistry();
    const order: string[] = [];
    registry.addReleaser(() => order.push("first"));
    registry.addReleaser(() => order.push("second"));

    registry.releaseAll();

    expect(order).toEqual(["first", "second"]);
  });

  it("某个释放动作抛错时其余动作照常执行, 错误不外泄", () => {
    const registry = createLockRegistry();
    const after = vi.fn();
    registry.addReleaser(() => {
      throw new Error("释放失败");
    });
    registry.addReleaser(after);

    expect(() => registry.releaseAll()).not.toThrow();
    expect(after).toHaveBeenCalledTimes(1);
  });
});
