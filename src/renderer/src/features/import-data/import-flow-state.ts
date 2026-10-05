import type { ImportFailure, ImportResult } from "@shared/import/import-result";
import type { ImportSourceKey } from "@shared/import/import-source-keys";
import {
  DEFAULT_DUPLICATE_POLICY,
  type ImportChooseOutcome,
  type ImportDuplicatePolicy,
  type ImportOutcome,
  type ImportPreview,
} from "@shared/import/import-types";

/**
 * 导入对话框默认选中的来源.
 */
export const DEFAULT_IMPORT_SOURCE: ImportSourceKey = "bitwardenJson";

/**
 * 选择来源与文件格式的步骤.
 */
export interface SourceStepState {
  /**
   * 步骤名.
   */
  readonly step: "source";
  /**
   * 选中的来源与文件格式.
   */
  readonly sourceKey: ImportSourceKey;
  /**
   * 上一次失败的原因, 没有失败时为 undefined.
   */
  readonly failure: ImportFailure | undefined;
}

/**
 * 主进程正在处理的步骤: 选择并解析文件, 或写库.
 */
export interface WorkingStepState {
  /**
   * 步骤名.
   */
  readonly step: "working";
  /**
   * 正在处理的是选择并解析文件, 还是确认后的写库.
   */
  readonly task: "choosing" | "importing";
  /**
   * 失败后回到的来源.
   */
  readonly sourceKey: ImportSourceKey;
}

/**
 * 预览与确认的步骤.
 */
export interface PreviewStepState {
  /**
   * 步骤名.
   */
  readonly step: "preview";
  /**
   * 解析概要.
   */
  readonly preview: ImportPreview;
  /**
   * 用户选的重复条目处理方式.
   */
  readonly duplicatePolicy: ImportDuplicatePolicy;
}

/**
 * 清单已保存的提示.
 */
export interface ResultNoticeSaved {
  /**
   * 提示的种类, 已保存恒为 saved.
   */
  readonly kind: "saved";
}

/**
 * 保存清单或打开所在文件夹失败的提示.
 */
export interface ResultNoticeFailed {
  /**
   * 提示的种类, 失败恒为 failed.
   */
  readonly kind: "failed";
  /**
   * 失败的原因.
   */
  readonly failure: ImportFailure;
}

/**
 * 结果页上保存清单与打开所在文件夹之后的提示.
 */
export type ResultNotice = ResultNoticeSaved | ResultNoticeFailed;

/**
 * 导入结果的步骤.
 */
export interface ResultStepState {
  /**
   * 步骤名.
   */
  readonly step: "result";
  /**
   * 导入概况与未能带入清单.
   */
  readonly outcome: ImportOutcome;
  /**
   * 保存清单或打开所在文件夹之后的提示, 没有时为 undefined.
   */
  readonly notice: ResultNotice | undefined;
}

/**
 * 导入对话框的流程状态.
 */
export type ImportFlowState =
  SourceStepState | WorkingStepState | PreviewStepState | ResultStepState;

/**
 * 导入对话框打开时的初始状态.
 */
export const INITIAL_IMPORT_FLOW_STATE: ImportFlowState = {
  step: "source",
  sourceKey: DEFAULT_IMPORT_SOURCE,
  failure: undefined,
};

/**
 * 选择来源与文件格式. 只在选择来源的步骤里生效.
 * @param state 当前状态.
 * @param sourceKey 选中的来源.
 * @returns 新状态.
 */
export function selectSource(
  state: ImportFlowState,
  sourceKey: ImportSourceKey,
): ImportFlowState {
  return state.step === "source"
    ? { step: "source", sourceKey, failure: undefined }
    : state;
}

/**
 * 开始选择并解析文件. 只在选择来源的步骤里生效.
 * @param state 当前状态.
 * @returns 新状态.
 */
export function startChoosing(state: ImportFlowState): ImportFlowState {
  return state.step === "source"
    ? { step: "working", task: "choosing", sourceKey: state.sourceKey }
    : state;
}

/**
 * 选择并解析文件失败, 回到选择来源并带上失败原因. 只在选择文件的处理中生效, 用户关闭对话框之后
 * 才返回的结果因此不会改写状态.
 * @param state 当前状态.
 * @param failure 失败原因.
 * @returns 新状态.
 */
export function failChoosing(
  state: ImportFlowState,
  failure: ImportFailure,
): ImportFlowState {
  return state.step === "working" && state.task === "choosing"
    ? { step: "source", sourceKey: state.sourceKey, failure }
    : state;
}

/**
 * 用户取消了选择文件, 回到选择来源. 只在选择文件的处理中生效.
 * @param state 当前状态.
 * @returns 新状态.
 */
export function cancelChoosing(state: ImportFlowState): ImportFlowState {
  return state.step === "working" && state.task === "choosing"
    ? { step: "source", sourceKey: state.sourceKey, failure: undefined }
    : state;
}

/**
 * 文件已解析, 进入预览, 重复条目的处理方式取默认值. 只在选择文件的处理中生效.
 * @param state 当前状态.
 * @param preview 解析概要.
 * @returns 新状态.
 */
export function showPreview(
  state: ImportFlowState,
  preview: ImportPreview,
): ImportFlowState {
  return state.step === "working" && state.task === "choosing"
    ? { step: "preview", preview, duplicatePolicy: DEFAULT_DUPLICATE_POLICY }
    : state;
}

/**
 * 改变重复条目的处理方式. 只在预览步骤里生效.
 * @param state 当前状态.
 * @param duplicatePolicy 新的处理方式.
 * @returns 新状态.
 */
export function changePolicy(
  state: ImportFlowState,
  duplicatePolicy: ImportDuplicatePolicy,
): ImportFlowState {
  return state.step === "preview" ? { ...state, duplicatePolicy } : state;
}

/**
 * 开始写库. 只在预览步骤里生效.
 * @param state 当前状态.
 * @returns 新状态.
 */
export function startImporting(state: ImportFlowState): ImportFlowState {
  return state.step === "preview"
    ? {
        step: "working",
        task: "importing",
        sourceKey: state.preview.sourceKey,
      }
    : state;
}

/**
 * 写库失败, 回到选择来源并带上失败原因. 只在写库的处理中生效.
 * @param state 当前状态.
 * @param failure 失败原因.
 * @returns 新状态.
 */
export function failImporting(
  state: ImportFlowState,
  failure: ImportFailure,
): ImportFlowState {
  return state.step === "working" && state.task === "importing"
    ? { step: "source", sourceKey: state.sourceKey, failure }
    : state;
}

/**
 * 写库完成, 进入结果页. 只在写库的处理中生效.
 * @param state 当前状态.
 * @param outcome 导入概况与未能带入清单.
 * @returns 新状态.
 */
export function finishImporting(
  state: ImportFlowState,
  outcome: ImportOutcome,
): ImportFlowState {
  return state.step === "working" && state.task === "importing"
    ? { step: "result", outcome, notice: undefined }
    : state;
}

/**
 * 从预览回到选择来源, 保留之前选的来源.
 * @param state 当前状态.
 * @returns 新状态.
 */
export function backToSource(state: ImportFlowState): ImportFlowState {
  return state.step === "preview"
    ? {
        step: "source",
        sourceKey: state.preview.sourceKey,
        failure: undefined,
      }
    : state;
}

/**
 * 把选择文件的结果应用到状态上: 失败回到选择来源, 取消回到选择来源, 已解析进入预览.
 * @param state 当前状态.
 * @param result 主进程返回的选择文件结果.
 * @returns 新状态.
 */
export function applyChooseResult(
  state: ImportFlowState,
  result: ImportResult<ImportChooseOutcome>,
): ImportFlowState {
  if (!result.ok) {
    return failChoosing(state, result);
  }
  return result.value.status === "ready"
    ? showPreview(state, result.value.preview)
    : cancelChoosing(state);
}

/**
 * 把确认导入的结果应用到状态上: 失败回到选择来源, 成功进入结果页.
 * @param state 当前状态.
 * @param result 主进程返回的导入结果.
 * @returns 新状态.
 */
export function applyRunResult(
  state: ImportFlowState,
  result: ImportResult<ImportOutcome>,
): ImportFlowState {
  return result.ok
    ? finishImporting(state, result.value)
    : failImporting(state, result);
}

/**
 * 在结果页显示保存清单或打开所在文件夹之后的提示. 只在结果页里生效.
 * @param state 当前状态.
 * @param notice 提示.
 * @returns 新状态.
 */
export function showNotice(
  state: ImportFlowState,
  notice: ResultNotice,
): ImportFlowState {
  return state.step === "result" ? { ...state, notice } : state;
}
