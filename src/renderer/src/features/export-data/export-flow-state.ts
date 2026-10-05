import type { ExportFailure, ExportResult } from "@shared/export/export-result";
import type {
  ExportRunOutcome,
  ExportSummary,
} from "@shared/export/export-types";

import { INITIAL_EXPORT_DRAFT, type ExportDraft } from "./export-draft";

/**
 * 选格式, 范围, 内容与加密的步骤.
 */
export interface OptionsStepState {
  /**
   * 步骤名.
   */
  readonly step: "options";
  /**
   * 填写的内容.
   */
  readonly draft: ExportDraft;
}

/**
 * 确认风险与主密码的步骤.
 */
export interface ConfirmStepState {
  /**
   * 步骤名.
   */
  readonly step: "confirm";
  /**
   * 填写的内容.
   */
  readonly draft: ExportDraft;
  /**
   * 是否已勾选 "我了解导出文件是明文".
   */
  readonly hasAcknowledged: boolean;
  /**
   * 重新输入的主密码.
   */
  readonly masterPassword: string;
  /**
   * 上一次导出失败的原因, 没有失败时为 undefined.
   */
  readonly failure: ExportFailure | undefined;
}

/**
 * 主进程正在处理的步骤: 弹出保存对话框, 读取, 写出. 带着确认步骤的内容, 失败或取消后回到确认步骤.
 */
export interface WorkingStepState {
  /**
   * 步骤名.
   */
  readonly step: "working";
  /**
   * 回到确认步骤时要还原的状态.
   */
  readonly confirm: ConfirmStepState;
}

/**
 * 导出完成后结果页上打开所在文件夹失败的提示.
 */
export interface ResultNotice {
  /**
   * 失败的原因.
   */
  readonly failure: ExportFailure;
}

/**
 * 导出结果的步骤.
 */
export interface ResultStepState {
  /**
   * 步骤名.
   */
  readonly step: "result";
  /**
   * 导出摘要.
   */
  readonly summary: ExportSummary;
  /**
   * 打开所在文件夹失败的提示, 没有时为 undefined.
   */
  readonly notice: ResultNotice | undefined;
}

/**
 * 导出对话框的流程状态.
 */
export type ExportFlowState =
  OptionsStepState | ConfirmStepState | WorkingStepState | ResultStepState;

/**
 * 导出对话框打开时的初始状态.
 */
export const INITIAL_EXPORT_FLOW_STATE: ExportFlowState = {
  step: "options",
  draft: INITIAL_EXPORT_DRAFT,
};

/**
 * 改动填写的内容. 只在第一步里生效.
 * @param state 当前状态.
 * @param changes 要改的部分.
 * @returns 新状态.
 */
export function changeDraft(
  state: ExportFlowState,
  changes: Partial<ExportDraft>,
): ExportFlowState {
  return state.step === "options"
    ? { step: "options", draft: { ...state.draft, ...changes } }
    : state;
}

/**
 * 进入确认步骤, 确认勾选与主密码清空. 只在第一步里生效.
 * @param state 当前状态.
 * @returns 新状态.
 */
export function goToConfirm(state: ExportFlowState): ExportFlowState {
  return state.step === "options"
    ? {
        step: "confirm",
        draft: state.draft,
        hasAcknowledged: false,
        masterPassword: "",
        failure: undefined,
      }
    : state;
}

/**
 * 回到第一步, 保留填写的内容. 只在确认步骤里生效.
 * @param state 当前状态.
 * @returns 新状态.
 */
export function backToOptions(state: ExportFlowState): ExportFlowState {
  return state.step === "confirm"
    ? { step: "options", draft: state.draft }
    : state;
}

/**
 * 勾选或取消勾选 "我了解导出文件是明文". 只在确认步骤里生效.
 * @param state 当前状态.
 * @param hasAcknowledged 是否勾选.
 * @returns 新状态.
 */
export function changeAcknowledged(
  state: ExportFlowState,
  hasAcknowledged: boolean,
): ExportFlowState {
  return state.step === "confirm"
    ? { ...state, hasAcknowledged, failure: undefined }
    : state;
}

/**
 * 改动重新输入的主密码. 只在确认步骤里生效.
 * @param state 当前状态.
 * @param masterPassword 主密码.
 * @returns 新状态.
 */
export function changeMasterPassword(
  state: ExportFlowState,
  masterPassword: string,
): ExportFlowState {
  return state.step === "confirm"
    ? { ...state, masterPassword, failure: undefined }
    : state;
}

/**
 * 开始导出. 只在确认步骤里生效.
 * @param state 当前状态.
 * @returns 新状态.
 */
export function startExporting(state: ExportFlowState): ExportFlowState {
  return state.step === "confirm" ? { step: "working", confirm: state } : state;
}

/**
 * 把导出的结果应用到状态上: 失败回到确认步骤并带上失败原因, 用户取消回到确认步骤, 成功进入结果页.
 * 只在处理中生效, 用户关闭对话框之后才返回的结果因此不会改写状态.
 * @param state 当前状态.
 * @param result 主进程返回的导出结果.
 * @returns 新状态.
 */
export function applyRunResult(
  state: ExportFlowState,
  result: ExportResult<ExportRunOutcome>,
): ExportFlowState {
  if (state.step !== "working") {
    return state;
  }
  if (!result.ok) {
    return { ...state.confirm, failure: result };
  }
  return result.value.status === "saved"
    ? { step: "result", summary: result.value.summary, notice: undefined }
    : { ...state.confirm, failure: undefined };
}

/**
 * 在结果页显示打开所在文件夹失败的提示. 只在结果页里生效.
 * @param state 当前状态.
 * @param failure 失败原因, 成功时为 undefined 表示清掉提示.
 * @returns 新状态.
 */
export function showRevealFailure(
  state: ExportFlowState,
  failure: ExportFailure | undefined,
): ExportFlowState {
  return state.step === "result"
    ? {
        ...state,
        notice: failure === undefined ? undefined : { failure },
      }
    : state;
}
