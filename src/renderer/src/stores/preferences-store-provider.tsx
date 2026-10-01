import type { ReactNode } from "react";

import { PreferencesStoreContext } from "./preferences-store-context";
import type { PreferencesStore } from "./preferences-store";

/**
 * 偏好 store Provider 的属性.
 */
interface PreferencesStoreProviderProps {
  /**
   * 要注入的偏好 store.
   */
  readonly store: PreferencesStore;
  /**
   * 子节点.
   */
  readonly children: ReactNode;
}

/**
 * 把偏好 store 注入其下的组件树.
 * @param props 组件属性.
 * @returns 包裹子节点的 Provider.
 */
export function PreferencesStoreProvider(
  props: PreferencesStoreProviderProps,
): React.JSX.Element {
  return (
    <PreferencesStoreContext.Provider value={props.store}>
      {props.children}
    </PreferencesStoreContext.Provider>
  );
}
