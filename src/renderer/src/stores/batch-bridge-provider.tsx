import type { ReactNode } from "react";

import type { BatchBridge } from "@shared/batch/batch-bridge";

import { BatchBridgeContext } from "./batch-bridge-context";

/**
 * 批量桥 Provider 的属性.
 */
interface BatchBridgeProviderProps {
  /**
   * 要注入的批量桥.
   */
  readonly bridge: BatchBridge;
  /**
   * 子节点.
   */
  readonly children: ReactNode;
}

/**
 * 把批量桥注入其下的组件树.
 * @param props 组件属性.
 * @returns 包裹子节点的 Provider.
 */
export function BatchBridgeProvider(
  props: BatchBridgeProviderProps,
): React.JSX.Element {
  return (
    <BatchBridgeContext.Provider value={props.bridge}>
      {props.children}
    </BatchBridgeContext.Provider>
  );
}
