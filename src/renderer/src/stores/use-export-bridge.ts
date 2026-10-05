import { useContext } from "react";

import type { ExportBridge } from "@shared/export/export-bridge";

import { ExportBridgeContext } from "./export-bridge-context";

/**
 * 取出导出桥.
 * @returns 导出桥.
 * @throws Error 组件不在 ExportBridgeProvider 内时.
 */
export function useExportBridge(): ExportBridge {
  const bridge = useContext(ExportBridgeContext);
  if (bridge === undefined) {
    throw new Error("useExportBridge 必须在 ExportBridgeProvider 内使用");
  }
  return bridge;
}
