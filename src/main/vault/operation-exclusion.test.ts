import { describe, expect, it } from "vitest";

import { createOperationExclusion } from "./operation-exclusion";

describe("createOperationExclusion", () => {
  it("初始未被占用, 第一次占用成功", () => {
    expect(createOperationExclusion().tryAcquire()).toBe(true);
  });

  it("已被占用时再次占用失败", () => {
    const exclusion = createOperationExclusion();
    exclusion.tryAcquire();

    expect(exclusion.tryAcquire()).toBe(false);
  });

  it("释放之后可以再次占用", () => {
    const exclusion = createOperationExclusion();
    exclusion.tryAcquire();
    exclusion.release();

    expect(exclusion.tryAcquire()).toBe(true);
  });

  it("不同实例互不影响", () => {
    const first = createOperationExclusion();
    const second = createOperationExclusion();
    first.tryAcquire();

    expect(second.tryAcquire()).toBe(true);
  });
});
