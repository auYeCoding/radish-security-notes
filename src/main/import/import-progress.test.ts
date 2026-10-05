import { describe, expect, it, vi } from "vitest";

import {
  createChunkObserver,
  createProgressTracker,
  ImportCancelledError,
} from "./import-progress";

describe("导入进度: 记录器", () => {
  it("初始空闲, 进入阶段后计数清零, 更新后快照随之变化", () => {
    const tracker = createProgressTracker();
    expect(tracker.snapshot()).toEqual({
      stage: "idle",
      processed: 0,
      total: 0,
    });
    tracker.begin("parsing");
    tracker.advance(3, 10);
    expect(tracker.snapshot()).toEqual({
      stage: "parsing",
      processed: 3,
      total: 10,
    });
    tracker.begin("planning");
    expect(tracker.snapshot().processed).toBe(0);
    tracker.reset();
    expect(tracker.snapshot().stage).toBe("idle");
  });
});

describe("导入进度: 分块观察者", () => {
  it("每处理完一块让出一次事件循环, 并更新进度", async () => {
    const tracker = createProgressTracker();
    tracker.begin("parsing");
    const yieldToEventLoop = vi.fn(async () => undefined);
    const observer = createChunkObserver({
      tracker,
      yieldToEventLoop,
      isCancelled: () => false,
      chunkSize: 4,
    });
    for (let processed = 1; processed <= 10; processed += 1) {
      await observer.advance(processed, 10);
    }
    expect(yieldToEventLoop).toHaveBeenCalledTimes(2);
    expect(tracker.snapshot()).toEqual({
      stage: "parsing",
      processed: 10,
      total: 10,
    });
  });

  it("用户取消后下一次报告抛出取消错误", async () => {
    let cancelled = false;
    const observer = createChunkObserver({
      tracker: createProgressTracker(),
      yieldToEventLoop: async () => undefined,
      isCancelled: () => cancelled,
    });
    await observer.advance(1, 5);
    cancelled = true;
    await expect(observer.advance(2, 5)).rejects.toBeInstanceOf(
      ImportCancelledError,
    );
  });
});
