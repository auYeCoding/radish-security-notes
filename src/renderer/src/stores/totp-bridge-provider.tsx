import type { ReactNode } from "react";

import type { TotpBridge } from "@shared/entries/totp-bridge";

import { TotpBridgeContext } from "./totp-bridge-context";

/**
 * TOTP 桥 Provider 的属性.
 */
interface TotpBridgeProviderProps {
  /**
   * 要注入的 TOTP 桥.
   */
  readonly bridge: TotpBridge;
  /**
   * 子节点.
   */
  readonly children: ReactNode;
}

/**
 * 把 TOTP 桥注入其下的组件树.
 * @param props 组件属性.
 * @returns 包裹子节点的 Provider.
 */
export function TotpBridgeProvider(
  props: TotpBridgeProviderProps,
): React.JSX.Element {
  return (
    <TotpBridgeContext.Provider value={props.bridge}>
      {props.children}
    </TotpBridgeContext.Provider>
  );
}
