import { createContext } from "react";

import type { EntryStore } from "./entry-store";

/**
 * 条目 store 的 React 上下文, 没有 Provider 时取值为 undefined.
 */
export const EntryStoreContext = createContext<EntryStore | undefined>(
  undefined,
);
