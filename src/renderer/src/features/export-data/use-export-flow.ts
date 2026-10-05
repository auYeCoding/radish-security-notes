import { useCallback, useMemo, useState } from "react";

import type { ExportProgressSnapshot } from "@shared/export/export-types";

import { useExportBridge } from "@renderer/stores/use-export-bridge";

import { toExportScope, type ExportDraft } from "./export-draft";
import {
  INITIAL_EXPORT_FLOW_STATE,
  backToOptions,
  changeAcknowledged,
  changeDraft,
  changeMasterPassword,
  goToConfirm,
  type ExportFlowState,
} from "./export-flow-state";
import { useExportProgress } from "./use-export-progress";
import { useExportResultActions } from "./use-export-result-actions";
import { useExportScopeIds, type ExportScopeIds } from "./use-export-scope-ids";
import { useExportWork } from "./use-export-work";
import { useScopeSummary, type ScopeSummaryState } from "./use-scope-summary";

/**
 * 导出对话框的流程: 当前状态, 所选范围的统计, 进度与各个动作.
 */
export interface ExportFlow {
  /**
   * 当前流程状态.
   */
  readonly state: ExportFlowState;
  /**
   * 渲染端知道的三种范围里的条目.
   */
  readonly scopeIds: ExportScopeIds;
  /**
   * 所选范围的统计状态.
   */
  readonly scopeSummary: ScopeSummaryState;
  /**
   * 主进程处理期间的进度, 其余时候为 undefined.
   */
  readonly progress: ExportProgressSnapshot | undefined;
  /**
   * 改动第一步填写的内容.
   */
  readonly changeDraft: (changes: Partial<ExportDraft>) => void;
  /**
   * 从第一步进入确认步骤.
   */
  readonly goToConfirm: () => void;
  /**
   * 从确认步骤回到第一步.
   */
  readonly backToOptions: () => void;
  /**
   * 勾选或取消勾选 "我了解导出文件是明文".
   */
  readonly changeAcknowledged: (hasAcknowledged: boolean) => void;
  /**
   * 改动重新输入的主密码.
   */
  readonly changeMasterPassword: (masterPassword: string) => void;
  /**
   * 开始导出.
   */
  readonly exportNow: () => Promise<void>;
  /**
   * 取消正在进行的导出.
   */
  readonly cancelWork: () => void;
  /**
   * 在文件管理器里定位导出的文件.
   */
  readonly revealFile: () => Promise<void>;
  /**
   * 对话框关闭时调用, 让主进程忘掉最近一次导出的路径.
   */
  readonly release: () => void;
}

/**
 * 取当前正在填写或处理的内容所选的范围, 结果页没有填写内容, 按全部范围统计.
 * @param state 流程状态.
 * @returns 范围选项.
 */
function scopeChoiceOf(state: ExportFlowState): ExportDraft["scopeChoice"] {
  switch (state.step) {
    case "options":
    case "confirm":
      return state.draft.scopeChoice;
    case "working":
      return state.confirm.draft.scopeChoice;
    default:
      return "all";
  }
}

/**
 * 导出对话框的流程钩子: 选格式与范围, 确认风险, 导出, 结果. 流程状态只在对话框里持有, 对话框关闭后
 * 随之丢弃, 加密口令与主密码也随之丢弃; 数据的读取, 序列化, 加密与写文件都在主进程.
 * @returns 导出流程.
 */
export function useExportFlow(): ExportFlow {
  const bridge = useExportBridge();
  const [state, setState] = useState<ExportFlowState>(
    INITIAL_EXPORT_FLOW_STATE,
  );
  const scopeIds = useExportScopeIds();
  const choice = scopeChoiceOf(state);
  const scope = useMemo(
    () => toExportScope(choice, scopeIds.currentIds, scopeIds.checkedIds),
    [choice, scopeIds],
  );
  const scopeSummary = useScopeSummary(scope);
  const progress = useExportProgress(state.step === "working");
  const work = useExportWork({ bridge, state, setState, scope });
  const resultActions = useExportResultActions(bridge, setState);
  const release = useCallback(() => void bridge.cancel(), [bridge]);
  return {
    state,
    scopeIds,
    scopeSummary,
    progress,
    changeDraft: (changes) =>
      setState((current) => changeDraft(current, changes)),
    goToConfirm: () => setState(goToConfirm),
    backToOptions: () => setState(backToOptions),
    changeAcknowledged: (hasAcknowledged) =>
      setState((current) => changeAcknowledged(current, hasAcknowledged)),
    changeMasterPassword: (masterPassword) =>
      setState((current) => changeMasterPassword(current, masterPassword)),
    cancelWork: release,
    release,
    ...work,
    ...resultActions,
  };
}
