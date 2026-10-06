import { describe, expect, it } from "vitest";

import { createRestoreProgressTracker } from "./restore-progress";

describe("恢复进度记录器", () => {
  it("初始是空闲状态", () => {
    expect(createRestoreProgressTracker().snapshot()).toEqual({
      stage: "idle",
      processed: 0,
      total: 0,
    });
  });

  it("进入阶段时计数清零, 更新计数保留阶段", () => {
    const tracker = createRestoreProgressTracker();

    tracker.begin("unpacking");
    tracker.advance(2, 5);

    expect(tracker.snapshot()).toEqual({
      stage: "unpacking",
      processed: 2,
      total: 5,
    });

    tracker.begin("validating");

    expect(tracker.snapshot()).toEqual({
      stage: "validating",
      processed: 0,
      total: 0,
    });
  });

  it("重置回到空闲", () => {
    const tracker = createRestoreProgressTracker();
    tracker.begin("writing");

    tracker.reset();

    expect(tracker.snapshot().stage).toBe("idle");
  });
});
