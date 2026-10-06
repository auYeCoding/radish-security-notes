import type { ReactNode } from "react";

import type { RestoreBridge } from "@shared/restore/restore-bridge";

import { RestoreBridgeContext } from "./restore-bridge-context";

/**
 * 恢复桥 Provider 的属性.
 */
interface RestoreBridgeProviderProps {
  /**
   * 要注入的恢复桥.
   */
  readonly bridge: RestoreBridge;
  /**
   * 子节点.
   */
  readonly children: ReactNode;
}

/**
 * 把恢复桥注入其下的组件树.
 * @param props 组件属性.
 * @returns 包裹子节点的 Provider.
 */
export function RestoreBridgeProvider(
  props: RestoreBridgeProviderProps,
): React.JSX.Element {
  return (
    <RestoreBridgeContext.Provider value={props.bridge}>
      {props.children}
    </RestoreBridgeContext.Provider>
  );
}
