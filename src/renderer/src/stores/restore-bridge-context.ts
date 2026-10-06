import { createContext } from "react";

import type { RestoreBridge } from "@shared/restore/restore-bridge";

/**
 * 恢复桥的 React 上下文, 没有 Provider 时取值为 undefined. 备份文件的内容与解析结果都留在主进程,
 * 渲染端只经桥拿到概要与结果摘要, 由恢复对话框自己持有.
 */
export const RestoreBridgeContext = createContext<RestoreBridge | undefined>(
  undefined,
);
