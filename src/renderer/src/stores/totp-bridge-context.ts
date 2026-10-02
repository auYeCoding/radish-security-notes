import { createContext } from "react";

import type { TotpBridge } from "@shared/entries/totp-bridge";

/**
 * TOTP 桥的 React 上下文, 没有 Provider 时取值为 undefined. 验证码与密钥不放进全局状态,
 * 组件按需经桥读取.
 */
export const TotpBridgeContext = createContext<TotpBridge | undefined>(
  undefined,
);
