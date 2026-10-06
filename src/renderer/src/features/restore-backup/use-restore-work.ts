import { useCallback, type Dispatch, type SetStateAction } from "react";

import type { RestoreBridge } from "@shared/restore/restore-bridge";

import {
  applyChooseResult,
  applyPassphraseResult,
  applyRunResult,
  startChoosing,
  startDecrypting,
  startRestoring,
  type RestoreFlowState,
} from "./restore-flow-state";
import {
  buildRestoreRunRequest,
  canConfirmRestore,
  canSubmitPassphrase,
} from "./restore-step-rules";

/**
 * 主进程处理相关的依赖.
 */
interface RestoreWorkDependencies {
  /**
   * 恢复桥.
   */
  readonly bridge: RestoreBridge;
  /**
   * 当前流程状态.
   */
  readonly state: RestoreFlowState;
  /**
   * 改写流程状态.
   */
  readonly setState: Dispatch<SetStateAction<RestoreFlowState>>;
  /**
   * 恢复成功后刷新界面数据.
   */
  readonly refreshAfterRestore: () => Promise<void>;
}

/**
 * 让主进程处理的三个动作.
 */
export interface RestoreWork {
  /**
   * 让主进程弹出选择文件对话框并读取所选文件, 完成后进入输入口令, 预览, 失败或回到选择文件.
   * @returns 完成后兑现.
   */
  readonly chooseFile: () => Promise<void>;
  /**
   * 用输入的口令解开加密备份, 完成后进入预览, 口令不对时回到输入口令, 其它失败进入失败步骤.
   * @returns 完成后兑现.
   */
  readonly submitPassphrase: () => Promise<void>;
  /**
   * 确认恢复, 完成后进入结果页, 主密码不对时回到预览, 其它失败进入失败步骤, 成功时刷新界面数据.
   * @returns 完成后兑现.
   */
  readonly confirm: () => Promise<void>;
}

/**
 * 选择文件, 提交口令与确认恢复三个要主进程处理的动作. 处理结果按状态机的守卫应用, 用户已经关闭
 * 对话框或状态已变化时, 迟到的结果被忽略.
 * @param dependencies 桥, 状态, 改写状态的函数与刷新函数.
 * @returns 三个动作.
 */
export function useRestoreWork(
  dependencies: RestoreWorkDependencies,
): RestoreWork {
  const { bridge, state, setState, refreshAfterRestore } = dependencies;
  const chooseFile = useCallback(async (): Promise<void> => {
    if (state.step !== "pick") {
      return;
    }
    setState(startChoosing);
    const result = await bridge.chooseFile();
    setState((current) => applyChooseResult(current, result));
  }, [bridge, state, setState]);
  const submitPassphrase = useCallback(async (): Promise<void> => {
    if (state.step !== "passphrase" || !canSubmitPassphrase(state)) {
      return;
    }
    setState(startDecrypting);
    const result = await bridge.submitPassphrase(state.passphrase);
    setState((current) => applyPassphraseResult(current, result));
  }, [bridge, state, setState]);
  const confirm = useCallback(async (): Promise<void> => {
    if (state.step !== "preview" || !canConfirmRestore(state)) {
      return;
    }
    setState(startRestoring);
    const result = await bridge.run(buildRestoreRunRequest(state));
    setState((current) => applyRunResult(current, result));
    if (result.ok) {
      await refreshAfterRestore();
    }
  }, [bridge, state, setState, refreshAfterRestore]);
  return { chooseFile, submitPassphrase, confirm };
}
