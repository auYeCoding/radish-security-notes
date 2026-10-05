import { describe, expect, it } from "vitest";

import { createExportProgressTracker } from "./export-progress";

describe("导出进度记录器", () => {
  it("初始是空闲", () => {
    expect(createExportProgressTracker().snapshot()).toEqual({
      stage: "idle",
      processed: 0,
      total: 0,
    });
  });

  it("进入阶段时计数清零, 更新计数保持阶段", () => {
    const tracker = createExportProgressTracker();
    tracker.begin("writing");
    expect(tracker.snapshot()).toEqual({
      stage: "writing",
      processed: 0,
      total: 0,
    });
    tracker.advance(3, 10);
    expect(tracker.snapshot()).toEqual({
      stage: "writing",
      processed: 3,
      total: 10,
    });
    tracker.begin("finishing");
    expect(tracker.snapshot()).toEqual({
      stage: "finishing",
      processed: 0,
      total: 0,
    });
  });

  it("重置回到空闲", () => {
    const tracker = createExportProgressTracker();
    tracker.begin("preparing");
    tracker.advance(1, 2);
    tracker.reset();
    expect(tracker.snapshot().stage).toBe("idle");
  });
});
