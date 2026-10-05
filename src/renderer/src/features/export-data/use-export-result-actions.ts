import { useCallback, type Dispatch, type SetStateAction } from "react";

import type { ExportBridge } from "@shared/export/export-bridge";

import { showRevealFailure, type ExportFlowState } from "./export-flow-state";

/**
 * 结果页上的动作.
 */
export interface ExportResultActions {
  /**
   * 让主进程在文件管理器里定位最近一次导出的文件, 失败时在结果页显示提示.
   * @returns 完成后兑现.
   */
  readonly revealFile: () => Promise<void>;
}

/**
 * 结果页上的动作: 打开所在文件夹. 文件路径只在主进程里, 这里只发出请求.
 * @param bridge 导出桥.
 * @param setState 改写流程状态.
 * @returns 结果页上的动作.
 */
export function useExportResultActions(
  bridge: ExportBridge,
  setState: Dispatch<SetStateAction<ExportFlowState>>,
): ExportResultActions {
  const revealFile = useCallback(async (): Promise<void> => {
    const result = await bridge.revealFile();
    setState((current) =>
      showRevealFailure(current, result.ok ? undefined : result),
    );
  }, [bridge, setState]);
  return { revealFile };
}
