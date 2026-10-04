import { createContext } from "react";

import type { BatchBridge } from "@shared/batch/batch-bridge";

/**
 * 批量桥的 React 上下文, 没有 Provider 时取值为 undefined. 批量桥只传编号, 组件按需经它调用.
 */
export const BatchBridgeContext = createContext<BatchBridge | undefined>(
  undefined,
);
