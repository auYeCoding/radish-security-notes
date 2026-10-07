import { createContext } from "react";

import type { MasterPasswordBridge } from "@shared/vault/master-password-bridge";

/**
 * 主密码开关桥的 React 上下文, 没有 Provider 时取值为 undefined. 切换在主进程里完成, 渲染端只经桥
 * 拿到当前是否设了主密码与操作结果, 由设置里的开关自己持有.
 */
export const MasterPasswordBridgeContext = createContext<
  MasterPasswordBridge | undefined
>(undefined);
