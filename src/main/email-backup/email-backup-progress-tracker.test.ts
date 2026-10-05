import { describe, expect, it } from "vitest";

import { createEmailBackupProgressTracker } from "./email-backup-progress-tracker";

describe("邮箱备份进度记录器", () => {
  it("初始是空闲状态", () => {
    expect(createEmailBackupProgressTracker().snapshot()).toEqual({
      stage: "idle",
      processed: 0,
      total: 0,
    });
  });

  it("生成备份阶段沿用导出的进度, 之后是发送阶段", () => {
    const tracker = createEmailBackupProgressTracker();
    tracker.generation.begin("writing");
    tracker.generation.advance(3, 10);
    expect(tracker.snapshot()).toEqual({
      stage: "writing",
      processed: 3,
      total: 10,
    });
    tracker.beginSending();
    expect(tracker.snapshot()).toEqual({
      stage: "sending",
      processed: 0,
      total: 0,
    });
  });

  it("重置后回到空闲状态", () => {
    const tracker = createEmailBackupProgressTracker();
    tracker.generation.begin("preparing");
    tracker.beginSending();
    tracker.reset();
    expect(tracker.snapshot().stage).toBe("idle");
  });
});
