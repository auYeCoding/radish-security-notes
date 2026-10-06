import type { AutoBackupStatus } from "@shared/email-backup/auto-backup-status";
import type { EmailBackupResult } from "@shared/email-backup/email-backup-result";

import type { EmailBackupFlowState } from "./email-backup-flow-state";

/**
 * 读到自动备份的最新状态.
 * @param state 当前状态.
 * @param autoBackup 自动备份的最新状态.
 * @returns 新状态.
 */
export function applyAutoBackup(
  state: EmailBackupFlowState,
  autoBackup: AutoBackupStatus,
): EmailBackupFlowState {
  return { ...state, autoBackup };
}

/**
 * 读完设置后套用读到的自动备份状态, 读取失败时保持默认状态.
 * @param state 当前状态.
 * @param result 读取自动备份状态的结果.
 * @returns 新状态.
 */
export function applyLoadedAutoBackup(
  state: EmailBackupFlowState,
  result: EmailBackupResult<AutoBackupStatus>,
): EmailBackupFlowState {
  return result.ok ? applyAutoBackup(state, result.value) : state;
}

/**
 * 自动备份的开关与间隔保存成功: 回到空闲, 用保存后的状态. 开关本身已经反映结果, 不另给提示.
 * @param state 当前状态.
 * @param autoBackup 保存后的自动备份状态.
 * @returns 新状态.
 */
export function applyAutoBackupSaved(
  state: EmailBackupFlowState,
  autoBackup: AutoBackupStatus,
): EmailBackupFlowState {
  return { ...state, autoBackup, activity: "idle", notice: { kind: "none" } };
}
