import type { ReactNode } from "react";

import type { MasterPasswordBridge } from "@shared/vault/master-password-bridge";

import { MasterPasswordBridgeContext } from "./master-password-bridge-context";

/**
 * 主密码开关桥 Provider 的属性.
 */
interface MasterPasswordBridgeProviderProps {
  /**
   * 要注入的主密码开关桥.
   */
  readonly bridge: MasterPasswordBridge;
  /**
   * 子节点.
   */
  readonly children: ReactNode;
}

/**
 * 把主密码开关桥注入其下的组件树.
 * @param props 组件属性.
 * @returns 包裹子节点的 Provider.
 */
export function MasterPasswordBridgeProvider(
  props: MasterPasswordBridgeProviderProps,
): React.JSX.Element {
  return (
    <MasterPasswordBridgeContext.Provider value={props.bridge}>
      {props.children}
    </MasterPasswordBridgeContext.Provider>
  );
}
