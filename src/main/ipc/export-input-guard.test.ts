import { describe, expect, it } from "vitest";

import {
  EXPORT_SECRET_MAX_LENGTH,
  MAX_EXPORT_ENTRY_ID_LENGTH,
  MAX_EXPORT_SCOPE_IDS,
} from "@shared/export/export-limits";

import { requireExportRequest, requireExportScope } from "./export-input-guard";

/**
 * 一个合规的导出请求原始值.
 * @param overrides 要覆盖的键.
 * @returns 请求原始值.
 */
function rawRequest(overrides: Record<string, unknown> = {}): unknown {
  return {
    format: "native",
    scope: { kind: "all" },
    includeSecrets: true,
    includeAttachments: true,
    hasAcknowledgedPlaintextRisk: true,
    ...overrides,
  };
}

/**
 * 断言一批原始值都被导出范围校验拒绝.
 * @param values 原始值.
 */
function expectScopesRejected(values: readonly unknown[]): void {
  for (const bad of values) {
    expect(() => requireExportScope(bad)).toThrow("无效的导出参数");
  }
}

/**
 * 断言一批原始值都被导出请求校验拒绝.
 * @param values 原始值.
 */
function expectRequestsRejected(values: readonly unknown[]): void {
  for (const bad of values) {
    expect(() => requireExportRequest(bad)).toThrow("无效的导出参数");
  }
}

describe("导出范围的进程边界校验: 合规的范围", () => {
  it("全部范围丢弃多余的键", () => {
    expect(requireExportScope({ kind: "all", extra: 1 })).toEqual({
      kind: "all",
    });
  });

  it("指定条目的范围复制编号数组, 丢弃多余的键, 空列表合规", () => {
    const ids = ["a", "b"];
    const scope = requireExportScope({ kind: "entries", entryIds: ids, x: 1 });
    expect(scope).toEqual({ kind: "entries", entryIds: ["a", "b"] });
    expect(scope.kind === "entries" && scope.entryIds).not.toBe(ids);
    expect(requireExportScope({ kind: "entries", entryIds: [] })).toEqual({
      kind: "entries",
      entryIds: [],
    });
  });
});

describe("导出范围的进程边界校验: 不合规的范围", () => {
  it("种类未知, 不是对象, 编号不是字符串, 为空串或过长时抛错", () => {
    expectScopesRejected([
      undefined,
      null,
      "all",
      { kind: "folder" },
      { kind: "entries" },
      { kind: "entries", entryIds: "a" },
      { kind: "entries", entryIds: [1] },
      { kind: "entries", entryIds: [""] },
      {
        kind: "entries",
        entryIds: ["a".repeat(MAX_EXPORT_ENTRY_ID_LENGTH + 1)],
      },
    ]);
  });

  it("编号个数超过边界上限时抛错, 恰好等于上限时合规", () => {
    const exactly = Array.from({ length: MAX_EXPORT_SCOPE_IDS }, () => "a");
    expect(() =>
      requireExportScope({ kind: "entries", entryIds: exactly }),
    ).not.toThrow();
    expectScopesRejected([{ kind: "entries", entryIds: [...exactly, "a"] }]);
  });
});

describe("导出请求的进程边界校验: 合规的请求", () => {
  it("合规请求原样通过, 多余的键被丢弃", () => {
    expect(requireExportRequest(rawRequest({ extra: "x" }))).toEqual({
      format: "native",
      scope: { kind: "all" },
      includeSecrets: true,
      includeAttachments: true,
      hasAcknowledgedPlaintextRisk: true,
    });
  });

  it("口令与主密码有就带上, 没给就没有这两个键, 口令过短留给服务判断", () => {
    const request = requireExportRequest(
      rawRequest({ passphrase: "long enough passphrase", masterPassword: "m" }),
    );
    expect(request.passphrase).toBe("long enough passphrase");
    expect(request.masterPassword).toBe("m");
    const bare = requireExportRequest(rawRequest());
    expect("passphrase" in bare || "masterPassword" in bare).toBe(false);
    expect(() =>
      requireExportRequest(rawRequest({ passphrase: "short" })),
    ).not.toThrow();
  });
});

describe("导出请求的进程边界校验: 不合规的请求", () => {
  it("格式未知, 标志不是布尔值, 不是对象时抛错", () => {
    expectRequestsRejected([
      rawRequest({ format: "keepassCsv" }),
      rawRequest({ format: undefined }),
      rawRequest({ includeSecrets: "yes" }),
      rawRequest({ includeAttachments: 1 }),
      rawRequest({ hasAcknowledgedPlaintextRisk: undefined }),
      null,
      "native",
      undefined,
    ]);
  });

  it("口令或主密码不是字符串或超过长度上限, 或范围不合规时抛错", () => {
    expectRequestsRejected([
      rawRequest({ passphrase: 5 }),
      rawRequest({ masterPassword: {} }),
      rawRequest({ passphrase: "a".repeat(EXPORT_SECRET_MAX_LENGTH + 1) }),
      rawRequest({ masterPassword: "a".repeat(EXPORT_SECRET_MAX_LENGTH + 1) }),
      rawRequest({ scope: { kind: "x" } }),
    ]);
  });
});
