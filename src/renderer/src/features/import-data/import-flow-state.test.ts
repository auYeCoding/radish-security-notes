import { describe, expect, it } from "vitest";

import { importFailed, importSucceeded } from "@shared/import/import-result";

import {
  FAKE_IMPORT_OUTCOME,
  FAKE_IMPORT_PREVIEW,
} from "@renderer/testing/fake-import-bridge";

import {
  INITIAL_IMPORT_FLOW_STATE,
  applyChooseResult,
  applyRunResult,
  backToSource,
  changePolicy,
  selectSource,
  showNotice,
  startChoosing,
  startImporting,
  type ImportFlowState,
} from "./import-flow-state";

/**
 * 走到预览步骤的状态.
 * @returns 预览步骤的状态.
 */
function previewState(): ImportFlowState {
  const choosing = startChoosing(INITIAL_IMPORT_FLOW_STATE);
  return applyChooseResult(
    choosing,
    importSucceeded({ status: "ready" as const, preview: FAKE_IMPORT_PREVIEW }),
  );
}

describe("导入流程状态: 选择文件", () => {
  it("选择来源后开始选择文件, 失败回到选择来源并带上原因", () => {
    const selected = selectSource(INITIAL_IMPORT_FLOW_STATE, "browserCsv");
    const choosing = startChoosing(selected);
    expect(choosing).toEqual({
      step: "working",
      task: "choosing",
      sourceKey: "browserCsv",
    });
    expect(applyChooseResult(choosing, importFailed("file-empty"))).toEqual({
      step: "source",
      sourceKey: "browserCsv",
      failure: { ok: false, reason: "file-empty" },
    });
  });

  it("取消回到选择来源, 已解析进入预览且重复处理取默认的跳过", () => {
    const choosing = startChoosing(INITIAL_IMPORT_FLOW_STATE);
    expect(
      applyChooseResult(
        choosing,
        importSucceeded({ status: "cancelled" as const }),
      ),
    ).toMatchObject({ step: "source", failure: undefined });
    expect(previewState()).toEqual({
      step: "preview",
      preview: FAKE_IMPORT_PREVIEW,
      duplicatePolicy: "skip",
    });
  });
});

describe("导入流程状态: 确认与结果", () => {
  it("改变重复处理, 确认后进入处理中, 成功进入结果页", () => {
    const changed = changePolicy(previewState(), "import");
    const importing = startImporting(changed);
    expect(importing).toMatchObject({ step: "working", task: "importing" });
    expect(
      applyRunResult(importing, importSucceeded(FAKE_IMPORT_OUTCOME)),
    ).toEqual({
      step: "result",
      outcome: FAKE_IMPORT_OUTCOME,
      notice: undefined,
    });
  });

  it("写库失败回到选择来源, 从预览重新选择也回到选择来源", () => {
    const importing = startImporting(previewState());
    expect(
      applyRunResult(importing, importFailed("unexpected-error")),
    ).toMatchObject({
      step: "source",
      failure: { reason: "unexpected-error" },
    });
    expect(backToSource(previewState())).toMatchObject({
      step: "source",
      sourceKey: "bitwardenJson",
    });
  });

  it("结果页可以显示提示, 其它步骤里的提示被忽略", () => {
    const result = applyRunResult(
      startImporting(previewState()),
      importSucceeded(FAKE_IMPORT_OUTCOME),
    );
    expect(showNotice(result, { kind: "saved" })).toMatchObject({
      notice: { kind: "saved" },
    });
    expect(showNotice(previewState(), { kind: "saved" })).toEqual(
      previewState(),
    );
  });
});

describe("导入流程状态: 迟到的结果", () => {
  it("用户已离开选择文件的处理后返回的结果被忽略", () => {
    const stale = applyChooseResult(
      INITIAL_IMPORT_FLOW_STATE,
      importSucceeded({
        status: "ready" as const,
        preview: FAKE_IMPORT_PREVIEW,
      }),
    );
    expect(stale).toEqual(INITIAL_IMPORT_FLOW_STATE);
  });

  it("不在处理中时写库结果与失败被忽略", () => {
    const state = previewState();
    expect(applyRunResult(state, importSucceeded(FAKE_IMPORT_OUTCOME))).toEqual(
      state,
    );
    expect(applyRunResult(state, importFailed("busy"))).toEqual(state);
  });
});
