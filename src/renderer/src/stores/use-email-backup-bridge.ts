import { useContext } from "react";

import type { EmailBackupBridge } from "@shared/email-backup/email-backup-bridge";

import { EmailBackupBridgeContext } from "./email-backup-bridge-context";

/**
 * 取出邮箱备份桥.
 * @returns 邮箱备份桥.
 * @throws Error 组件不在 EmailBackupBridgeProvider 内时.
 */
export function useEmailBackupBridge(): EmailBackupBridge {
  const bridge = useContext(EmailBackupBridgeContext);
  if (bridge === undefined) {
    throw new Error(
      "useEmailBackupBridge 必须在 EmailBackupBridgeProvider 内使用",
    );
  }
  return bridge;
}
