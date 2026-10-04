import type { ReactNode } from "react";

import type { LinkBridge } from "@shared/links/link-bridge";

import { LinkBridgeContext } from "./link-bridge-context";

/**
 * 链接桥 Provider 的属性.
 */
interface LinkBridgeProviderProps {
  /**
   * 要注入的链接桥.
   */
  readonly bridge: LinkBridge;
  /**
   * 子节点.
   */
  readonly children: ReactNode;
}

/**
 * 把链接桥注入其下的组件树.
 * @param props 组件属性.
 * @returns 包裹子节点的 Provider.
 */
export function LinkBridgeProvider(
  props: LinkBridgeProviderProps,
): React.JSX.Element {
  return (
    <LinkBridgeContext.Provider value={props.bridge}>
      {props.children}
    </LinkBridgeContext.Provider>
  );
}
