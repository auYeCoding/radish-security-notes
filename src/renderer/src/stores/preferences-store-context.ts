import { createContext } from "react";

import type { PreferencesStore } from "./preferences-store";

/**
 * 偏好 store 的 React 上下文, 没有 Provider 时取值为 undefined.
 */
export const PreferencesStoreContext = createContext<
  PreferencesStore | undefined
>(undefined);
