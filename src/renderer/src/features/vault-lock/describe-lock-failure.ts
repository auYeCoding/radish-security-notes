import type { TFunction } from "i18next";

import type { VaultFailureReason } from "@shared/vault/vault-operation-result";

/**
 * 把锁定被拒绝的原因换成当前语言的文案. 提示里不带任何数据内容.
 * @param reason 失败原因.
 * @param translate 翻译函数.
 * @returns 文案.
 */
export function describeLockFailure(
  reason: VaultFailureReason,
  translate: TFunction,
): string {
  switch (reason) {
    case "tasks-running":
      return translate("vault.lock.blocked.tasksRunning");
    case "master-password-required":
      return translate("vault.lock.blocked.masterPasswordRequired");
    case "unexpected-state":
      return translate("vault.lock.blocked.unexpectedState");
    default:
      return translate("vault.lock.blocked.unexpected");
  }
}
