import type { ReactNode } from "react";

import type { ExportBridge } from "@shared/export/export-bridge";

import { ExportBridgeContext } from "./export-bridge-context";

/**
 * 导出桥 Provider 的属性.
 */
interface ExportBridgeProviderProps {
  /**
   * 要注入的导出桥.
   */
  readonly bridge: ExportBridge;
  /**
   * 子节点.
   */
  readonly children: ReactNode;
}

/**
 * 把导出桥注入其下的组件树.
 * @param props 组件属性.
 * @returns 包裹子节点的 Provider.
 */
export function ExportBridgeProvider(
  props: ExportBridgeProviderProps,
): React.JSX.Element {
  return (
    <ExportBridgeContext.Provider value={props.bridge}>
      {props.children}
    </ExportBridgeContext.Provider>
  );
}
