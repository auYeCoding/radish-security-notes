import { useCallback, useState } from "react";

import type { RestoreProgressSnapshot } from "@shared/restore/restore-types";

import { detachPromise } from "@renderer/lib/detach-promise";
import { useRestoreBridge } from "@renderer/stores/use-restore-bridge";

import {
  INITIAL_RESTORE_FLOW_STATE,
  backToPick,
  changeAcknowledgedReplace,
  changeMasterPassword,
  changePassphrase,
  type RestoreFlowState,
} from "./restore-flow-state";
import { useRefreshAfterRestore } from "./use-refresh-after-restore";
import { useRestoreProgress } from "./use-restore-progress";
import { useRestoreWork } from "./use-restore-work";

/**
 * 恢复对话框的流程: 当前状态, 进度与各个动作.
 */
export interface RestoreFlow {
  /**
   * 当前流程状态.
   */
  readonly state: RestoreFlowState;
  /**
   * 主进程处理期间的进度, 其余时候为 undefined.
   */
  readonly progress: RestoreProgressSnapshot | undefined;
  /**
   * 弹出选择文件对话框并读取所选文件.
   */
  readonly chooseFile: () => Promise<void>;
  /**
   * 改动正在输入的备份口令.
   */
  readonly changePassphrase: (passphrase: string) => void;
  /**
   * 提交备份口令.
   */
  readonly submitPassphrase: () => Promise<void>;
  /**
   * 改动重新输入的主密码.
   */
  readonly changeMasterPassword: (masterPassword: string) => void;
  /**
   * 勾选或取消勾选 "我明白这些数据将被永久删除".
   */
  readonly changeAcknowledgedReplace: (hasAcknowledgedReplace: boolean) => void;
  /**
   * 确认恢复.
   */
  readonly confirm: () => Promise<void>;
  /**
   * 回到选择文件, 并让主进程释放所选文件与读出的备份.
   */
  readonly backToPick: () => void;
  /**
   * 对话框关闭时调用, 让主进程释放所选文件与读出的备份.
   */
  readonly release: () => void;
}

/**
 * 恢复对话框的流程钩子: 选择文件, 输入口令, 预览与确认, 结果. 流程状态只在对话框里持有, 对话框
 * 关闭后随之丢弃, 口令与主密码也随之丢弃; 备份文件的读取, 解密, 解包, 校验与写库都在主进程.
 * @returns 恢复流程.
 */
export function useRestoreFlow(): RestoreFlow {
  const bridge = useRestoreBridge();
  const [state, setState] = useState<RestoreFlowState>(
    INITIAL_RESTORE_FLOW_STATE,
  );
  const refreshAfterRestore = useRefreshAfterRestore();
  const progress = useRestoreProgress(state.step === "working");
  const work = useRestoreWork({ bridge, state, setState, refreshAfterRestore });
  const release = useCallback(() => detachPromise(bridge.cancel()), [bridge]);
  return {
    state,
    progress,
    changePassphrase: (passphrase) =>
      setState((current) => changePassphrase(current, passphrase)),
    changeMasterPassword: (masterPassword) =>
      setState((current) => changeMasterPassword(current, masterPassword)),
    changeAcknowledgedReplace: (hasAcknowledgedReplace) =>
      setState((current) =>
        changeAcknowledgedReplace(current, hasAcknowledgedReplace),
      ),
    backToPick: () => {
      release();
      setState(backToPick);
    },
    release,
    ...work,
  };
}
