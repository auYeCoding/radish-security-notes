import type { ReactNode } from "react";

import type { WindowControlsBridge } from "@shared/window/window-controls-bridge";

import { WindowControlsBridgeContext } from "./window-controls-bridge-context";

/**
 * 窗口控制桥 Provider 的属性.
 */
interface WindowControlsBridgeProviderProps {
  /**
   * 要注入的窗口控制桥.
   */
  readonly bridge: WindowControlsBridge;
  /**
   * 子节点.
   */
  readonly children: ReactNode;
}

/**
 * 把窗口控制桥注入其下的组件树.
 * @param props 组件属性.
 * @returns 包裹子节点的 Provider.
 */
export function WindowControlsBridgeProvider(
  props: WindowControlsBridgeProviderProps,
): React.JSX.Element {
  return (
    <WindowControlsBridgeContext.Provider value={props.bridge}>
      {props.children}
    </WindowControlsBridgeContext.Provider>
  );
}
