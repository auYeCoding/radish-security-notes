import { createContext } from "react";

import type { ExportBridge } from "@shared/export/export-bridge";

/**
 * 导出桥的 React 上下文, 没有 Provider 时取值为 undefined. 数据在主进程里读取, 序列化, 加密并写成
 * 文件, 渲染端只经桥拿到计数与导出摘要, 由导出对话框自己持有.
 */
export const ExportBridgeContext = createContext<ExportBridge | undefined>(
  undefined,
);
