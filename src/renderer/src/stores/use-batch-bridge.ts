import { useContext } from "react";

import type { BatchBridge } from "@shared/batch/batch-bridge";

import { BatchBridgeContext } from "./batch-bridge-context";

/**
 * 取出批量桥.
 * @returns 批量桥.
 * @throws Error 组件不在 BatchBridgeProvider 内时.
 */
export function useBatchBridge(): BatchBridge {
  const bridge = useContext(BatchBridgeContext);
  if (bridge === undefined) {
    throw new Error("useBatchBridge 必须在 BatchBridgeProvider 内使用");
  }
  return bridge;
}
