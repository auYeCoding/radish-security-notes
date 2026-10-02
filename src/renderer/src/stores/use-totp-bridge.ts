import { useContext } from "react";

import type { TotpBridge } from "@shared/entries/totp-bridge";

import { TotpBridgeContext } from "./totp-bridge-context";

/**
 * 取出 TOTP 桥.
 * @returns TOTP 桥.
 * @throws Error 组件不在 TotpBridgeProvider 内时.
 */
export function useTotpBridge(): TotpBridge {
  const bridge = useContext(TotpBridgeContext);
  if (bridge === undefined) {
    throw new Error("useTotpBridge 必须在 TotpBridgeProvider 内使用");
  }
  return bridge;
}
