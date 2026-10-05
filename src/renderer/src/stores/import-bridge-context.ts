import { createContext } from "react";

import type { ImportBridge } from "@shared/import/import-bridge";

/**
 * 导入桥的 React 上下文, 没有 Provider 时取值为 undefined. 来源文件的内容与解析结果都留在主进程,
 * 渲染端只经桥拿到概要与未能带入清单, 由导入对话框自己持有.
 */
export const ImportBridgeContext = createContext<ImportBridge | undefined>(
  undefined,
);
