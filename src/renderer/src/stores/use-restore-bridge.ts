import { useContext } from "react";

import type { RestoreBridge } from "@shared/restore/restore-bridge";

import { RestoreBridgeContext } from "./restore-bridge-context";

/**
 * 取出恢复桥.
 * @returns 恢复桥.
 * @throws Error 组件不在 RestoreBridgeProvider 内时.
 */
export function useRestoreBridge(): RestoreBridge {
  const bridge = useContext(RestoreBridgeContext);
  if (bridge === undefined) {
    throw new Error("useRestoreBridge 必须在 RestoreBridgeProvider 内使用");
  }
  return bridge;
}
