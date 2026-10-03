import { createContext } from "react";

import type { FolderStore } from "./folder-store";

/**
 * 文件夹 store 的 React 上下文, 没有 Provider 时取值为 undefined.
 */
export const FolderStoreContext = createContext<FolderStore | undefined>(
  undefined,
);
