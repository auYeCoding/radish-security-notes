import type { Dispatch, SetStateAction } from "react";

import type { EmailBackupBridge } from "@shared/email-backup/email-backup-bridge";

import { applyAutoBackup } from "./email-backup-auto-state";
import type { EmailBackupFlowState } from "./email-backup-flow-state";

/**
 * 从主进程重新读取自动备份的状态并写进流程状态. 保存邮箱设置或备份之后调用: 保存设置可能清除暂停
 * 或消除开启受阻的原因, 备份成功会改变下次计划时间与失败记录. 读取失败时保持原状态.
 * @param bridge 邮箱备份桥.
 * @param setState 流程状态的更新函数.
 * @returns 读取并写入之后兑现.
 */
export async function refreshAutoBackup(
  bridge: EmailBackupBridge,
  setState: Dispatch<SetStateAction<EmailBackupFlowState>>,
): Promise<void> {
  const result = await bridge.getAutoBackup();
  if (result.ok) {
    setState((current) => applyAutoBackup(current, result.value));
  }
}
