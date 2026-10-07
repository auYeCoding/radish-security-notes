import { useContext } from "react";

import type { WindowControlsBridge } from "@shared/window/window-controls-bridge";

import { WindowControlsBridgeContext } from "./window-controls-bridge-context";

/**
 * 取出窗口控制桥.
 * @returns 窗口控制桥.
 * @throws Error 组件不在 WindowControlsBridgeProvider 内时.
 */
export function useWindowControlsBridge(): WindowControlsBridge {
  const bridge = useContext(WindowControlsBridgeContext);
  if (bridge === undefined) {
    throw new Error(
      "useWindowControlsBridge 必须在 WindowControlsBridgeProvider 内使用",
    );
  }
  return bridge;
}
