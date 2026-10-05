import { MAX_EXPORT_ENTRIES } from "@shared/export/export-limits";
import type { ExportRequest, ExportScope } from "@shared/export/export-request";

import {
  findPassphraseProblem,
  willIncludeAttachments,
  type ExportDraft,
} from "./export-draft";
import type { ConfirmStepState } from "./export-flow-state";
import type { ScopeSummaryState } from "./use-scope-summary";

/**
 * 所选范围的问题: 还在统计, 统计失败, 范围里没有条目, 或条目超过一次能导出的上限.
 */
export type ScopeProblem = "loading" | "failed" | "empty" | "too-many";

/**
 * 找出所选范围现在的问题.
 * @param summary 范围的统计状态.
 * @returns 问题, 范围可以导出时为 undefined.
 */
export function findScopeProblem(
  summary: ScopeSummaryState,
): ScopeProblem | undefined {
  if (summary.status !== "ready") {
    return summary.status;
  }
  if (summary.summary.entryCount === 0) {
    return "empty";
  }
  return summary.summary.entryCount > MAX_EXPORT_ENTRIES
    ? "too-many"
    : undefined;
}

/**
 * 判断第一步能否进入确认步骤: 范围没有问题, 加密口令没有问题.
 * @param draft 填写内容.
 * @param summary 所选范围的统计状态.
 * @returns 能进入时返回 true.
 */
export function canGoToConfirm(
  draft: ExportDraft,
  summary: ScopeSummaryState,
): boolean {
  return (
    findScopeProblem(summary) === undefined &&
    findPassphraseProblem(draft) === undefined
  );
}

/**
 * 判断确认步骤能否开始导出: 不加密时必须勾选了明文风险, 设了主密码时必须填了主密码.
 * @param state 确认步骤的状态.
 * @param hasMasterPassword 保险库是否设了主密码.
 * @returns 能开始时返回 true.
 */
export function canStartExport(
  state: ConfirmStepState,
  hasMasterPassword: boolean,
): boolean {
  const isAcknowledged = state.draft.isEncrypted || state.hasAcknowledged;
  const hasMasterPasswordEntry =
    !hasMasterPassword || state.masterPassword !== "";
  return isAcknowledged && hasMasterPasswordEntry;
}

/**
 * 由确认步骤的状态与范围拼出送给主进程的导出请求. 加密时带上口令, 填了主密码时带上主密码.
 * @param state 确认步骤的状态.
 * @param scope 导出的范围.
 * @returns 导出请求.
 */
export function buildExportRequest(
  state: ConfirmStepState,
  scope: ExportScope,
): ExportRequest {
  const { draft } = state;
  return {
    format: draft.format,
    scope,
    includeSecrets: draft.includeSecrets,
    includeAttachments: willIncludeAttachments(draft),
    hasAcknowledgedPlaintextRisk: state.hasAcknowledged,
    ...(draft.isEncrypted ? { passphrase: draft.passphrase } : {}),
    ...(state.masterPassword === ""
      ? {}
      : { masterPassword: state.masterPassword }),
  };
}
