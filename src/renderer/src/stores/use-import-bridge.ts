import { useContext } from "react";

import type { ImportBridge } from "@shared/import/import-bridge";

import { ImportBridgeContext } from "./import-bridge-context";

/**
 * 取出导入桥.
 * @returns 导入桥.
 * @throws Error 组件不在 ImportBridgeProvider 内时.
 */
export function useImportBridge(): ImportBridge {
  const bridge = useContext(ImportBridgeContext);
  if (bridge === undefined) {
    throw new Error("useImportBridge 必须在 ImportBridgeProvider 内使用");
  }
  return bridge;
}
