import { describe, expect, it } from "vitest";

import {
  MAIL_ENVELOPE_OVERHEAD_BYTES,
  estimateMailSizeBytes,
} from "./mail-size-estimator";

describe("邮件大小估计", () => {
  it("没有附件时只有封装开销", () => {
    expect(estimateMailSizeBytes(0)).toBe(MAIL_ENVELOPE_OVERHEAD_BYTES);
  });

  it("附件按 base64 膨胀到 4/3, 每 76 个字符加一个换行", () => {
    expect(estimateMailSizeBytes(3)).toBe(MAIL_ENVELOPE_OVERHEAD_BYTES + 4 + 2);
    expect(estimateMailSizeBytes(57)).toBe(
      MAIL_ENVELOPE_OVERHEAD_BYTES + 76 + 2,
    );
    expect(estimateMailSizeBytes(58)).toBe(
      MAIL_ENVELOPE_OVERHEAD_BYTES + 80 + 4,
    );
  });

  it("大附件的估计超过文件大小的 1.33 倍", () => {
    const size = 10 * 1024 * 1024;
    expect(estimateMailSizeBytes(size)).toBeGreaterThan(size * 1.33);
  });
});
