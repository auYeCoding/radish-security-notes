import type { RestoreRunRequest } from "@shared/restore/restore-types";

import type {
  PassphraseStepState,
  PreviewStepState,
} from "./restore-flow-state";

/**
 * 判断输入口令的步骤能否提交: 口令不能为空.
 * @param state 输入口令步骤的状态.
 * @returns 能提交时返回 true.
 */
export function canSubmitPassphrase(state: PassphraseStepState): boolean {
  return state.passphrase !== "";
}

/**
 * 判断预览步骤能否开始恢复: 保险库非空时必须勾选了清空确认, 保险库设了主密码时必须填了主密码.
 * @param state 预览步骤的状态.
 * @returns 能开始时返回 true.
 */
export function canConfirmRestore(state: PreviewStepState): boolean {
  const { preview } = state;
  const isReplaceAcknowledged =
    preview.vault.isEmpty || state.hasAcknowledgedReplace;
  const hasMasterPasswordEntry =
    !preview.requiresMasterPassword || state.masterPassword !== "";
  return isReplaceAcknowledged && hasMasterPasswordEntry;
}

/**
 * 由预览步骤的状态拼出送给主进程的恢复请求: 勾选状态原样带上, 保险库设了主密码时带上主密码.
 * @param state 预览步骤的状态.
 * @returns 恢复请求.
 */
export function buildRestoreRunRequest(
  state: PreviewStepState,
): RestoreRunRequest {
  return {
    acknowledgesReplace: state.hasAcknowledgedReplace,
    ...(state.preview.requiresMasterPassword
      ? { masterPassword: state.masterPassword }
      : {}),
  };
}
