import { useEffect, type Dispatch, type SetStateAction } from "react";

import type { EmailBackupBridge } from "@shared/email-backup/email-backup-bridge";

import {
  applyLoadFailed,
  applyLoaded,
  type EmailBackupFlowState,
} from "./email-backup-flow-state";

/**
 * 对话框挂载时从主进程读取已保存的设置与上次备份的结果, 读到后填进流程状态. 对话框关闭或桥换了
 * 以后迟到的应答被忽略.
 * @param bridge 邮箱备份桥.
 * @param setState 流程状态的更新函数.
 */
export function useLoadEmailBackupSettings(
  bridge: EmailBackupBridge,
  setState: Dispatch<SetStateAction<EmailBackupFlowState>>,
): void {
  useEffect(() => {
    let isCurrent = true;
    const load = async (): Promise<void> => {
      const [settings, lastResult] = await Promise.all([
        bridge.getSettings(),
        bridge.getLastResult(),
      ]);
      if (!isCurrent) {
        return;
      }
      setState((state) =>
        settings.ok
          ? applyLoaded(
              state,
              settings.value,
              lastResult.ok ? lastResult.value : undefined,
            )
          : applyLoadFailed(state),
      );
    };
    void load();
    return () => {
      isCurrent = false;
    };
  }, [bridge, setState]);
}
