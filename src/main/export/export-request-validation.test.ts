import { describe, expect, it } from "vitest";

import { exportRequestOf } from "../testing/export-service-fixture";
import { findRequestViolation } from "./export-request-validation";

describe("导出请求校验", () => {
  it("不加密且已确认明文风险时合规", () => {
    expect(findRequestViolation(exportRequestOf())).toBeUndefined();
  });

  it("不加密且没确认明文风险时不合规", () => {
    expect(
      findRequestViolation(
        exportRequestOf({ hasAcknowledgedPlaintextRisk: false }),
      ),
    ).toBe("plaintext-not-acknowledged");
  });

  it("加密时口令必须是 12 到 1024 个字符, 与是否确认明文风险无关", () => {
    const base = { hasAcknowledgedPlaintextRisk: false };
    expect(
      findRequestViolation(
        exportRequestOf({ ...base, passphrase: "a".repeat(12) }),
      ),
    ).toBeUndefined();
    expect(
      findRequestViolation(
        exportRequestOf({ ...base, passphrase: "a".repeat(11) }),
      ),
    ).toBe("invalid-passphrase");
    expect(
      findRequestViolation(
        exportRequestOf({ ...base, passphrase: "a".repeat(1025) }),
      ),
    ).toBe("invalid-passphrase");
    expect(
      findRequestViolation(exportRequestOf({ ...base, passphrase: "" })),
    ).toBe("invalid-passphrase");
  });
});
