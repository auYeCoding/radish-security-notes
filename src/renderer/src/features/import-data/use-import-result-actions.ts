import { useCallback, type Dispatch, type SetStateAction } from "react";

import type { ImportBridge } from "@shared/import/import-bridge";

import { showNotice, type ImportFlowState } from "./import-flow-state";

/**
 * 结果页上的两个动作.
 */
export interface ImportResultActions {
  /**
   * 让主进程弹出保存对话框, 把未能带入清单写成文本文件; 保存成功或失败时在结果页显示提示,
   * 用户取消时不显示.
   * @returns 完成后兑现.
   */
  readonly saveReport: () => Promise<void>;
  /**
   * 让主进程在文件管理器里定位来源文件; 失败时在结果页显示提示.
   * @returns 完成后兑现.
   */
  readonly revealFile: () => Promise<void>;
}

/**
 * 结果页上保存清单与打开所在文件夹两个动作.
 * @param bridge 导入桥.
 * @param setState 改写流程状态的函数.
 * @returns 两个动作.
 */
export function useImportResultActions(
  bridge: ImportBridge,
  setState: Dispatch<SetStateAction<ImportFlowState>>,
): ImportResultActions {
  const saveReport = useCallback(async (): Promise<void> => {
    const result = await bridge.saveReport();
    if (!result.ok) {
      setState((state) =>
        showNotice(state, { kind: "failed", failure: result }),
      );
    } else if (result.value.status === "saved") {
      setState((state) => showNotice(state, { kind: "saved" }));
    }
  }, [bridge, setState]);
  const revealFile = useCallback(async (): Promise<void> => {
    const result = await bridge.revealFile();
    if (!result.ok) {
      setState((state) =>
        showNotice(state, { kind: "failed", failure: result }),
      );
    }
  }, [bridge, setState]);
  return { saveReport, revealFile };
}
