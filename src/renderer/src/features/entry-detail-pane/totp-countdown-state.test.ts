import { describe, expect, it } from "vitest";

import {
  computeTotpCountdown,
  TOTP_ENDING_THRESHOLD_SECONDS,
} from "./totp-countdown-state";

describe("computeTotpCountdown 剩余秒数", () => {
  it("向上取整, 不到一秒也算还剩 1 秒", () => {
    expect(computeTotpCountdown(30000, 0, 30).remainingSeconds).toBe(30);
    expect(computeTotpCountdown(30000, 1, 30).remainingSeconds).toBe(30);
    expect(computeTotpCountdown(30000, 999, 30).remainingSeconds).toBe(30);
    expect(computeTotpCountdown(30000, 1000, 30).remainingSeconds).toBe(29);
    expect(computeTotpCountdown(30000, 29999, 30).remainingSeconds).toBe(1);
  });

  it("到期时刻之后不小于 0, 超出周期时不大于周期", () => {
    expect(computeTotpCountdown(30000, 30000, 30).remainingSeconds).toBe(0);
    expect(computeTotpCountdown(30000, 45000, 30).remainingSeconds).toBe(0);
    expect(computeTotpCountdown(90000, 0, 30).remainingSeconds).toBe(30);
  });
});

describe("computeTotpCountdown 临近换码", () => {
  it("30 秒周期里剩余 10 秒及以下提示, 11 秒不提示", () => {
    expect(TOTP_ENDING_THRESHOLD_SECONDS).toBe(10);
    expect(computeTotpCountdown(30000, 20000, 30).isEnding).toBe(true);
    expect(computeTotpCountdown(30000, 29999, 30).isEnding).toBe(true);
    expect(computeTotpCountdown(30000, 19999, 30).isEnding).toBe(false);
    expect(computeTotpCountdown(30000, 0, 30).isEnding).toBe(false);
  });

  it("60 秒周期同样是剩余 10 秒及以下", () => {
    expect(computeTotpCountdown(60000, 50000, 60).isEnding).toBe(true);
    expect(computeTotpCountdown(60000, 48999, 60).isEnding).toBe(false);
  });

  it("周期很短时阈值取周期的三分之一, 刚换码时不提示", () => {
    expect(computeTotpCountdown(15000, 0, 15).isEnding).toBe(false);
    expect(computeTotpCountdown(15000, 10000, 15).isEnding).toBe(true);
    expect(computeTotpCountdown(15000, 9999, 15).isEnding).toBe(false);
    expect(computeTotpCountdown(1000, 0, 1).isEnding).toBe(false);
  });
});
