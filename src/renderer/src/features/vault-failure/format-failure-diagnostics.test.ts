import { describe, expect, it } from "vitest";

import { formatFailureDiagnostics } from "./format-failure-diagnostics";

describe("formatFailureDiagnostics", () => {
  it("没有底层错误时只有原因与阶段", () => {
    expect(
      formatFailureDiagnostics({
        cause: "database-missing",
        stage: "startup",
        errorName: undefined,
      }),
    ).toBe("cause=database-missing; stage=startup");
  });

  it("有底层错误时多一项错误类名", () => {
    expect(
      formatFailureDiagnostics({
        cause: "database-unreadable",
        stage: "unlock",
        errorName: "DatabaseKeyRejectedError",
      }),
    ).toBe(
      "cause=database-unreadable; stage=unlock; error=DatabaseKeyRejectedError",
    );
  });
});
