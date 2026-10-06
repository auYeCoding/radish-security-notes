import type { AutoBackupSaveRequest } from "@shared/email-backup/auto-backup-status";

import { applyAutoBackupSaved } from "./email-backup-auto-state";
import { applyFailed, startActivity } from "./email-backup-flow-state";
import type { EmailBackupWorkParameters } from "./use-email-backup-work";

/**
 * 用户在自动备份区做的选择: 开关与间隔.
 */
export type AutoBackupChoice = Pick<
  AutoBackupSaveRequest,
  "isEnabled" | "interval"
>;

/**
 * 自动备份区能触发的动作.
 */
export interface AutoBackupWork {
  /**
   * 保存自动备份的开关与间隔, 设了主密码时带上填写的主密码.
   * @param choice 开关与间隔.
   * @returns 保存结束之后兑现.
   */
  readonly saveAuto: (choice: AutoBackupChoice) => Promise<void>;
}

/**
 * 自动备份区的动作: 保存开关与间隔. 先把流程状态切到进行中, 调用桥, 再把结果写回状态.
 * @param parameters 桥, 当前状态与状态更新函数.
 * @returns 自动备份区的动作.
 */
export function useAutoBackupWork(
  parameters: EmailBackupWorkParameters,
): AutoBackupWork {
  const { bridge, state, setState } = parameters;
  return {
    saveAuto: async (choice) => {
      const { masterPassword } = state.draft;
      setState((current) => startActivity(current, "saving-auto"));
      const result = await bridge.saveAutoBackup({
        ...choice,
        ...(masterPassword === "" ? {} : { masterPassword }),
      });
      setState((current) =>
        result.ok
          ? applyAutoBackupSaved(current, result.value)
          : applyFailed(current, result.reason),
      );
    },
  };
}
