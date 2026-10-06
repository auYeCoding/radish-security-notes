import { describe, expect, it } from "vitest";

import { formatRestoreTime } from "./format-restore-time";

describe("备份时间的显示", () => {
  it("中文界面写成年月日与时分", () => {
    expect(formatRestoreTime("2026-10-05T12:30:00", "zh")).toBe(
      "2026年10月5日 12:30",
    );
  });

  it("英文界面写成英文的日期与时间", () => {
    expect(formatRestoreTime("2026-10-05T12:30:00", "en")).toMatch(
      /^Oct 5, 2026, 12:30\sPM$/,
    );
  });

  it("时间文本无法解析时原样返回", () => {
    expect(formatRestoreTime("not a time", "zh")).toBe("not a time");
  });
});
