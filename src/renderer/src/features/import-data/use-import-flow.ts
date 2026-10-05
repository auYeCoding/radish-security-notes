import { useCallback, useState } from "react";

import type { ImportSourceKey } from "@shared/import/import-source-keys";
import type {
  ImportDuplicatePolicy,
  ImportProgressSnapshot,
} from "@shared/import/import-types";

import { useImportBridge } from "@renderer/stores/use-import-bridge";

import {
  INITIAL_IMPORT_FLOW_STATE,
  backToSource,
  changePolicy,
  selectSource,
  type ImportFlowState,
} from "./import-flow-state";
import { useImportProgress } from "./use-import-progress";
import { useImportResultActions } from "./use-import-result-actions";
import { useImportWork } from "./use-import-work";
import { useRefreshAfterImport } from "./use-refresh-after-import";

/**
 * 导入对话框的流程: 当前状态, 进度与各个动作.
 */
export interface ImportFlow {
  /**
   * 当前流程状态.
   */
  readonly state: ImportFlowState;
  /**
   * 主进程处理期间的进度, 其余时候为 undefined.
   */
  readonly progress: ImportProgressSnapshot | undefined;
  /**
   * 选择来源与文件格式.
   */
  readonly selectSource: (sourceKey: ImportSourceKey) => void;
  /**
   * 弹出选择文件对话框并解析所选文件.
   */
  readonly chooseFile: () => Promise<void>;
  /**
   * 改变重复条目的处理方式.
   */
  readonly changePolicy: (policy: ImportDuplicatePolicy) => void;
  /**
   * 确认导入.
   */
  readonly confirm: () => Promise<void>;
  /**
   * 从预览回到选择来源, 并让主进程释放解析结果.
   */
  readonly backToSource: () => void;
  /**
   * 取消正在进行的选择与解析.
   */
  readonly cancelWork: () => void;
  /**
   * 保存未能带入清单.
   */
  readonly saveReport: () => Promise<void>;
  /**
   * 在文件管理器里定位来源文件.
   */
  readonly revealFile: () => Promise<void>;
  /**
   * 对话框关闭时调用, 让主进程释放解析结果与保留的信息.
   */
  readonly release: () => void;
}

/**
 * 导入对话框的流程钩子: 选择来源, 选择文件并解析, 预览与确认, 结果与清单. 流程状态只在对话框
 * 里持有, 对话框关闭后随之丢弃; 来源文件的内容与解析结果都留在主进程.
 * @returns 导入流程.
 */
export function useImportFlow(): ImportFlow {
  const bridge = useImportBridge();
  const [state, setState] = useState<ImportFlowState>(
    INITIAL_IMPORT_FLOW_STATE,
  );
  const refreshAfterImport = useRefreshAfterImport();
  const progress = useImportProgress(state.step === "working");
  const work = useImportWork({ bridge, state, setState, refreshAfterImport });
  const resultActions = useImportResultActions(bridge, setState);
  const release = useCallback(() => void bridge.cancel(), [bridge]);
  return {
    state,
    progress,
    selectSource: (sourceKey) =>
      setState((current) => selectSource(current, sourceKey)),
    changePolicy: (policy) =>
      setState((current) => changePolicy(current, policy)),
    backToSource: () => {
      release();
      setState(backToSource);
    },
    cancelWork: release,
    release,
    ...work,
    ...resultActions,
  };
}
