import type { Dispatch, SetStateAction } from "react";

import type { EmailBackupBridge } from "@shared/email-backup/email-backup-bridge";

import { toSettingsInput } from "./email-backup-draft";
import {
  applyBackupOutcome,
  applyFailed,
  applyLastResult,
  applySaved,
  applyTestSent,
  startActivity,
  type EmailBackupFlowState,
} from "./email-backup-flow-state";
import { refreshAutoBackup } from "./refresh-auto-backup";

/**
 * 邮箱备份动作需要的依赖.
 */
export interface EmailBackupWorkParameters {
  /**
   * 邮箱备份桥.
   */
  readonly bridge: EmailBackupBridge;
  /**
   * 当前流程状态, 动作从中取填写内容.
   */
  readonly state: EmailBackupFlowState;
  /**
   * 流程状态的更新函数.
   */
  readonly setState: Dispatch<SetStateAction<EmailBackupFlowState>>;
}

/**
 * 用户能触发的三个动作.
 */
export interface EmailBackupWork {
  /**
   * 保存设置.
   * @returns 保存结束之后兑现.
   */
  readonly save: () => Promise<void>;
  /**
   * 发送测试邮件.
   * @returns 发送结束之后兑现.
   */
  readonly sendTest: () => Promise<void>;
  /**
   * 立即备份.
   * @param withoutAttachments 是否去掉附件.
   * @returns 备份结束之后兑现.
   */
  readonly runBackup: (withoutAttachments: boolean) => Promise<void>;
}

/**
 * 邮箱备份的三个动作: 保存设置, 发送测试邮件, 立即备份. 每个动作先把流程状态切到进行中, 调用桥,
 * 再把结果写回状态; 立即备份结束后再读一次上次结果.
 * @param parameters 桥, 当前状态与状态更新函数.
 * @returns 三个动作.
 */
export function useEmailBackupWork(
  parameters: EmailBackupWorkParameters,
): EmailBackupWork {
  const { bridge, state, setState } = parameters;
  return {
    save: async () => {
      setState((current) => startActivity(current, "saving"));
      const result = await bridge.saveSettings(toSettingsInput(state.draft));
      setState((current) =>
        result.ok
          ? applySaved(current, result.value)
          : applyFailed(current, result.reason),
      );
      if (result.ok) {
        await refreshAutoBackup(bridge, setState);
      }
    },
    sendTest: async () => {
      setState((current) => startActivity(current, "testing"));
      const result = await bridge.sendTest();
      setState((current) =>
        result.ok
          ? applyTestSent(current)
          : applyFailed(current, result.reason),
      );
    },
    runBackup: async (withoutAttachments) => {
      const { masterPassword } = state.draft;
      setState((current) => startActivity(current, "backing-up"));
      const result = await bridge.runBackup({
        withoutAttachments,
        ...(masterPassword === "" ? {} : { masterPassword }),
      });
      setState((current) =>
        result.ok
          ? applyBackupOutcome(current, result.value)
          : applyFailed(current, result.reason),
      );
      const lastResult = await bridge.getLastResult();
      if (lastResult.ok) {
        setState((current) => applyLastResult(current, lastResult.value));
      }
      await refreshAutoBackup(bridge, setState);
    },
  };
}
