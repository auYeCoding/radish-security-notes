import { describe, expect, it } from "vitest";

import { exportFailed, exportSucceeded } from "@shared/export/export-result";

import { FAKE_EXPORT_SUMMARY } from "@renderer/testing/fake-export-bridge";

import {
  INITIAL_EXPORT_FLOW_STATE,
  applyRunResult,
  backToOptions,
  changeAcknowledged,
  changeDraft,
  changeMasterPassword,
  goToConfirm,
  showRevealFailure,
  startExporting,
  type ExportFlowState,
} from "./export-flow-state";

/**
 * 走到确认步骤的状态.
 * @returns 确认步骤的状态.
 */
function confirmState(): ExportFlowState {
  return goToConfirm(
    changeDraft(INITIAL_EXPORT_FLOW_STATE, { isEncrypted: true }),
  );
}

/**
 * 走到处理中的状态.
 * @returns 处理中的状态.
 */
function workingState(): ExportFlowState {
  return startExporting(changeMasterPassword(confirmState(), "m"));
}

describe("导出流程状态: 第一步与确认步骤", () => {
  it("改动填写内容只在第一步生效", () => {
    const changed = changeDraft(INITIAL_EXPORT_FLOW_STATE, {
      format: "browserCsv",
    });
    expect(changed).toMatchObject({
      step: "options",
      draft: { format: "browserCsv" },
    });
    expect(changeDraft(confirmState(), { format: "browserCsv" })).toEqual(
      confirmState(),
    );
  });

  it("进入确认步骤时勾选与主密码清空, 返回时保留填写内容", () => {
    expect(confirmState()).toMatchObject({
      step: "confirm",
      hasAcknowledged: false,
      masterPassword: "",
      failure: undefined,
      draft: { isEncrypted: true },
    });
    expect(backToOptions(confirmState())).toMatchObject({
      step: "options",
      draft: { isEncrypted: true },
    });
  });

  it("勾选与主密码只在确认步骤生效, 改动会清掉上一次的失败", () => {
    const failed = applyRunResult(
      workingState(),
      exportFailed("wrong-master-password"),
    );
    expect(failed).toMatchObject({
      step: "confirm",
      failure: { reason: "wrong-master-password" },
    });
    expect(changeMasterPassword(failed, "n")).toMatchObject({
      masterPassword: "n",
      failure: undefined,
    });
    expect(changeAcknowledged(failed, true)).toMatchObject({
      hasAcknowledged: true,
      failure: undefined,
    });
    expect(changeAcknowledged(INITIAL_EXPORT_FLOW_STATE, true)).toBe(
      INITIAL_EXPORT_FLOW_STATE,
    );
  });
});

describe("导出流程状态: 导出的结果", () => {
  it("开始导出只在确认步骤生效, 带着确认步骤的内容", () => {
    expect(startExporting(INITIAL_EXPORT_FLOW_STATE)).toBe(
      INITIAL_EXPORT_FLOW_STATE,
    );
    expect(workingState()).toMatchObject({
      step: "working",
      confirm: { step: "confirm", masterPassword: "m" },
    });
  });

  it("成功进入结果页, 取消回到确认步骤保留内容", () => {
    const saved = applyRunResult(
      workingState(),
      exportSucceeded({
        status: "saved" as const,
        summary: FAKE_EXPORT_SUMMARY,
      }),
    );
    expect(saved).toEqual({
      step: "result",
      summary: FAKE_EXPORT_SUMMARY,
      notice: undefined,
    });
    const cancelled = applyRunResult(
      workingState(),
      exportSucceeded({ status: "cancelled" as const }),
    );
    expect(cancelled).toMatchObject({
      step: "confirm",
      masterPassword: "m",
      failure: undefined,
    });
  });

  it("结果只在处理中生效, 迟到的结果被忽略", () => {
    const stale = applyRunResult(
      INITIAL_EXPORT_FLOW_STATE,
      exportFailed("busy"),
    );
    expect(stale).toBe(INITIAL_EXPORT_FLOW_STATE);
  });
});

describe("导出流程状态: 结果页的提示", () => {
  it("打开所在文件夹失败时显示提示, 成功时清掉, 只在结果页生效", () => {
    const result = applyRunResult(
      workingState(),
      exportSucceeded({
        status: "saved" as const,
        summary: FAKE_EXPORT_SUMMARY,
      }),
    );
    const failed = showRevealFailure(result, exportFailed("reveal-failed"));
    expect(failed).toMatchObject({
      notice: { failure: { reason: "reveal-failed" } },
    });
    expect(showRevealFailure(failed, undefined)).toMatchObject({
      notice: undefined,
    });
    expect(
      showRevealFailure(
        INITIAL_EXPORT_FLOW_STATE,
        exportFailed("reveal-failed"),
      ),
    ).toBe(INITIAL_EXPORT_FLOW_STATE);
  });
});
