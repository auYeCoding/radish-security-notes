import type { ReactNode } from "react";

import { VaultStoreContext } from "./vault-store-context";
import type { VaultStore } from "./vault-store";

/**
 * 保险库 store Provider 的属性.
 */
interface VaultStoreProviderProps {
  /**
   * 要注入的保险库 store.
   */
  readonly store: VaultStore;
  /**
   * 子节点.
   */
  readonly children: ReactNode;
}

/**
 * 把保险库 store 注入其下的组件树.
 * @param props 组件属性.
 * @returns 包裹子节点的 Provider.
 */
export function VaultStoreProvider(
  props: VaultStoreProviderProps,
): React.JSX.Element {
  return (
    <VaultStoreContext.Provider value={props.store}>
      {props.children}
    </VaultStoreContext.Provider>
  );
}
