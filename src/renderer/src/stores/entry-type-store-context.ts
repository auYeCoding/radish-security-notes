import { createContext } from "react";

import type { EntryTypeStore } from "./entry-type-store";

/**
 * 自定义条目类型 store 的 React 上下文, 没有 Provider 时取值为 undefined.
 */
export const EntryTypeStoreContext = createContext<EntryTypeStore | undefined>(
  undefined,
);
