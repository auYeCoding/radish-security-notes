import type { ReactNode } from "react";

import type { ImportBridge } from "@shared/import/import-bridge";

import { ImportBridgeContext } from "./import-bridge-context";

/**
 * 导入桥 Provider 的属性.
 */
interface ImportBridgeProviderProps {
  /**
   * 要注入的导入桥.
   */
  readonly bridge: ImportBridge;
  /**
   * 子节点.
   */
  readonly children: ReactNode;
}

/**
 * 把导入桥注入其下的组件树.
 * @param props 组件属性.
 * @returns 包裹子节点的 Provider.
 */
export function ImportBridgeProvider(
  props: ImportBridgeProviderProps,
): React.JSX.Element {
  return (
    <ImportBridgeContext.Provider value={props.bridge}>
      {props.children}
    </ImportBridgeContext.Provider>
  );
}
