import { describe, expect, it } from "vitest";

import { formatLocalIsoDate } from "./local-iso-date";

describe("formatLocalIsoDate", () => {
  it("月与日补零, 按本地时区取值", () => {
    expect(formatLocalIsoDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(formatLocalIsoDate(new Date(2026, 9, 12, 0, 0))).toBe("2026-10-12");
  });
});
