import { createContext } from "react";

import type { VaultStore } from "./vault-store";

/**
 * 保险库 store 的 React 上下文, 没有 Provider 时取值为 undefined.
 */
export const VaultStoreContext = createContext<VaultStore | undefined>(
  undefined,
);
