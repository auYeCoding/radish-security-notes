import { useCallback, type Dispatch, type SetStateAction } from "react";

import type { ImportBridge } from "@shared/import/import-bridge";

import {
  applyChooseResult,
  applyRunResult,
  startChoosing,
  startImporting,
  type ImportFlowState,
} from "./import-flow-state";

/**
 * 主进程处理相关的依赖.
 */
interface ImportWorkDependencies {
  /**
   * 导入桥.
   */
  readonly bridge: ImportBridge;
  /**
   * 当前流程状态.
   */
  readonly state: ImportFlowState;
  /**
   * 改写流程状态.
   */
  readonly setState: Dispatch<SetStateAction<ImportFlowState>>;
  /**
   * 导入成功后刷新界面数据.
   */
  readonly refreshAfterImport: () => Promise<void>;
}

/**
 * 让主进程处理的两个动作.
 */
export interface ImportWork {
  /**
   * 让主进程弹出选择文件对话框并解析所选文件, 完成后进入预览或回到选择来源.
   * @returns 完成后兑现.
   */
  readonly chooseFile: () => Promise<void>;
  /**
   * 确认导入, 完成后进入结果页或回到选择来源, 成功时刷新界面数据.
   * @returns 完成后兑现.
   */
  readonly confirm: () => Promise<void>;
}

/**
 * 选择文件与确认导入两个要主进程处理的动作. 处理结果按状态机的守卫应用, 用户已经关闭对话框或
 * 状态已变化时, 迟到的结果被忽略.
 * @param dependencies 桥, 状态, 改写状态的函数与刷新函数.
 * @returns 选择文件与确认导入的动作.
 */
export function useImportWork(
  dependencies: ImportWorkDependencies,
): ImportWork {
  const { bridge, state, setState, refreshAfterImport } = dependencies;
  const chooseFile = useCallback(async (): Promise<void> => {
    if (state.step !== "source") {
      return;
    }
    setState(startChoosing);
    const result = await bridge.chooseFile(state.sourceKey);
    setState((current) => applyChooseResult(current, result));
  }, [bridge, state, setState]);
  const confirm = useCallback(async (): Promise<void> => {
    if (state.step !== "preview") {
      return;
    }
    setState(startImporting);
    const result = await bridge.run({ duplicatePolicy: state.duplicatePolicy });
    setState((current) => applyRunResult(current, result));
    if (result.ok) {
      await refreshAfterImport();
    }
  }, [bridge, state, setState, refreshAfterImport]);
  return { chooseFile, confirm };
}
