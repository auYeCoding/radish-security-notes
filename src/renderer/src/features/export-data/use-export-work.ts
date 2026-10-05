import { useCallback, type Dispatch, type SetStateAction } from "react";

import type { ExportBridge } from "@shared/export/export-bridge";
import type { ExportScope } from "@shared/export/export-request";

import {
  applyRunResult,
  startExporting,
  type ExportFlowState,
} from "./export-flow-state";
import { buildExportRequest } from "./export-step-rules";

/**
 * 主进程处理相关的依赖.
 */
interface ExportWorkDependencies {
  /**
   * 导出桥.
   */
  readonly bridge: ExportBridge;
  /**
   * 当前流程状态.
   */
  readonly state: ExportFlowState;
  /**
   * 改写流程状态.
   */
  readonly setState: Dispatch<SetStateAction<ExportFlowState>>;
  /**
   * 所选范围.
   */
  readonly scope: ExportScope;
}

/**
 * 让主进程处理的动作.
 */
export interface ExportWork {
  /**
   * 开始导出: 主进程校验, 弹出保存对话框, 读取并写出文件, 完成后进入结果页, 失败或用户取消后回到
   * 确认步骤.
   * @returns 完成后兑现.
   */
  readonly exportNow: () => Promise<void>;
}

/**
 * 开始导出这个要主进程处理的动作. 处理结果按状态机的守卫应用, 用户已经关闭对话框或状态已变化时,
 * 迟到的结果被忽略.
 * @param dependencies 桥, 状态, 改写状态的函数与范围.
 * @returns 开始导出的动作.
 */
export function useExportWork(
  dependencies: ExportWorkDependencies,
): ExportWork {
  const { bridge, state, setState, scope } = dependencies;
  const exportNow = useCallback(async (): Promise<void> => {
    if (state.step !== "confirm") {
      return;
    }
    setState(startExporting);
    const result = await bridge.run(buildExportRequest(state, scope));
    setState((current) => applyRunResult(current, result));
  }, [bridge, state, setState, scope]);
  return { exportNow };
}
