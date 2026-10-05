import { describe, expect, it } from "vitest";

import { MAX_EXPORT_ENTRIES } from "@shared/export/export-limits";

import { INITIAL_EXPORT_DRAFT, type ExportDraft } from "./export-draft";
import type { ConfirmStepState } from "./export-flow-state";
import {
  buildExportRequest,
  canGoToConfirm,
  canStartExport,
  findScopeProblem,
} from "./export-step-rules";
import type { ScopeSummaryState } from "./use-scope-summary";

/**
 * 统计完成的状态.
 * @param entryCount 条目数.
 * @param hasMasterPassword 是否设了主密码.
 * @returns 统计状态.
 */
function ready(
  entryCount: number,
  hasMasterPassword = true,
): ScopeSummaryState {
  return {
    status: "ready",
    summary: {
      entryCount,
      attachmentCount: 0,
      attachmentBytes: 0,
      hasMasterPassword,
    },
  };
}

/**
 * 确认步骤的状态.
 * @param overrides 要覆盖的部分.
 * @param draft 填写内容.
 * @returns 确认步骤的状态.
 */
function confirmOf(
  overrides: Partial<ConfirmStepState> = {},
  draft: Partial<ExportDraft> = {},
): ConfirmStepState {
  return {
    step: "confirm",
    draft: { ...INITIAL_EXPORT_DRAFT, ...draft },
    hasAcknowledged: false,
    masterPassword: "",
    failure: undefined,
    ...overrides,
  };
}

describe("所选范围的问题", () => {
  it("统计中, 统计失败, 为空, 超过上限各有对应的问题, 否则没有问题", () => {
    expect(findScopeProblem({ status: "loading" })).toBe("loading");
    expect(findScopeProblem({ status: "failed" })).toBe("failed");
    expect(findScopeProblem(ready(0))).toBe("empty");
    expect(findScopeProblem(ready(MAX_EXPORT_ENTRIES + 1))).toBe("too-many");
    expect(findScopeProblem(ready(MAX_EXPORT_ENTRIES))).toBeUndefined();
    expect(findScopeProblem(ready(1))).toBeUndefined();
  });

  it("第一步能否进入确认: 范围没问题且口令没问题", () => {
    expect(canGoToConfirm(INITIAL_EXPORT_DRAFT, ready(3))).toBe(true);
    expect(canGoToConfirm(INITIAL_EXPORT_DRAFT, ready(0))).toBe(false);
    const short = { ...INITIAL_EXPORT_DRAFT, isEncrypted: true };
    expect(canGoToConfirm(short, ready(3))).toBe(false);
    const good = {
      ...short,
      passphrase: "a".repeat(12),
      passphraseConfirmation: "a".repeat(12),
    };
    expect(canGoToConfirm(good, ready(3))).toBe(true);
  });
});

describe("确认步骤能否开始导出", () => {
  it("不加密时必须勾选明文风险, 加密时不需要", () => {
    expect(canStartExport(confirmOf(), false)).toBe(false);
    expect(canStartExport(confirmOf({ hasAcknowledged: true }), false)).toBe(
      true,
    );
    expect(canStartExport(confirmOf({}, { isEncrypted: true }), false)).toBe(
      true,
    );
  });

  it("设了主密码时必须填主密码", () => {
    const acknowledged = confirmOf({ hasAcknowledged: true });
    expect(canStartExport(acknowledged, true)).toBe(false);
    expect(canStartExport({ ...acknowledged, masterPassword: "m" }, true)).toBe(
      true,
    );
  });
});

describe("拼出导出请求", () => {
  it("不加密时不带口令, 没填主密码时不带主密码, 附件按格式能力决定", () => {
    const request = buildExportRequest(
      confirmOf({ hasAcknowledged: true }, { format: "bitwardenJson" }),
      { kind: "all" },
    );
    expect(request).toEqual({
      format: "bitwardenJson",
      scope: { kind: "all" },
      includeSecrets: true,
      includeAttachments: false,
      hasAcknowledgedPlaintextRisk: true,
    });
  });

  it("加密时带口令, 填了主密码时带主密码", () => {
    const state = confirmOf(
      { masterPassword: "m" },
      {
        isEncrypted: true,
        passphrase: "a".repeat(12),
        passphraseConfirmation: "a".repeat(12),
      },
    );
    expect(
      buildExportRequest(state, { kind: "entries", entryIds: ["x"] }),
    ).toMatchObject({
      scope: { kind: "entries", entryIds: ["x"] },
      passphrase: "a".repeat(12),
      masterPassword: "m",
      includeAttachments: true,
    });
  });
});
