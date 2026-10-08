import { describe, expect, it } from "vitest";

import { AUTO_LOCK_REASONS, isAutoLockReason } from "./auto-lock-reason";

describe("isAutoLockReason", () => {
  it.each(AUTO_LOCK_REASONS)("接受登记过的原因 %s", (reason) => {
    expect(isAutoLockReason(reason)).toBe(true);
  });

  it.each(["manual", "", undefined, null, 1])("拒绝 %s", (value) => {
    expect(isAutoLockReason(value)).toBe(false);
  });
});
