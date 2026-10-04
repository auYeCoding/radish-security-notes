import { useContext } from "react";

import type { LinkBridge } from "@shared/links/link-bridge";

import { LinkBridgeContext } from "./link-bridge-context";

/**
 * 取出链接桥.
 * @returns 链接桥.
 * @throws Error 组件不在 LinkBridgeProvider 内时.
 */
export function useLinkBridge(): LinkBridge {
  const bridge = useContext(LinkBridgeContext);
  if (bridge === undefined) {
    throw new Error("useLinkBridge 必须在 LinkBridgeProvider 内使用");
  }
  return bridge;
}
