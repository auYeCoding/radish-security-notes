import { createContext } from "react";

import type { BatchSelectionStore } from "./batch-selection-store";

/**
 * 批量选中 store 的 React 上下文, 没有 Provider 时取值为 undefined.
 */
export const BatchSelectionStoreContext = createContext<
  BatchSelectionStore | undefined
>(undefined);
