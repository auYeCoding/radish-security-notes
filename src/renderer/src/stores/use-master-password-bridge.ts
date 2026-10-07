import { useContext } from "react";

import type { MasterPasswordBridge } from "@shared/vault/master-password-bridge";

import { MasterPasswordBridgeContext } from "./master-password-bridge-context";

/**
 * 取出主密码开关桥.
 * @returns 主密码开关桥.
 * @throws Error 组件不在 MasterPasswordBridgeProvider 内时.
 */
export function useMasterPasswordBridge(): MasterPasswordBridge {
  const bridge = useContext(MasterPasswordBridgeContext);
  if (bridge === undefined) {
    throw new Error(
      "useMasterPasswordBridge 必须在 MasterPasswordBridgeProvider 内使用",
    );
  }
  return bridge;
}
