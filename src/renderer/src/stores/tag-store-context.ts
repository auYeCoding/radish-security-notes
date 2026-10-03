import { createContext } from "react";

import type { TagStore } from "./tag-store";

/**
 * 标签 store 的 React 上下文, 没有 Provider 时取值为 undefined.
 */
export const TagStoreContext = createContext<TagStore | undefined>(undefined);
