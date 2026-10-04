import { createContext } from "react";

import type { LinkBridge } from "@shared/links/link-bridge";

/**
 * 链接桥的 React 上下文, 没有 Provider 时取值为 undefined. 链接不放进全局状态, 组件按需经桥请主
 * 进程打开.
 */
export const LinkBridgeContext = createContext<LinkBridge | undefined>(
  undefined,
);
