import type { ReactNode } from "react";

import type { EmailBackupBridge } from "@shared/email-backup/email-backup-bridge";

import { EmailBackupBridgeContext } from "./email-backup-bridge-context";

/**
 * 邮箱备份桥 Provider 的属性.
 */
interface EmailBackupBridgeProviderProps {
  /**
   * 要注入的邮箱备份桥.
   */
  readonly bridge: EmailBackupBridge;
  /**
   * 子节点.
   */
  readonly children: ReactNode;
}

/**
 * 把邮箱备份桥注入其下的组件树.
 * @param props 组件属性.
 * @returns 包裹子节点的 Provider.
 */
export function EmailBackupBridgeProvider(
  props: EmailBackupBridgeProviderProps,
): React.JSX.Element {
  return (
    <EmailBackupBridgeContext.Provider value={props.bridge}>
      {props.children}
    </EmailBackupBridgeContext.Provider>
  );
}
