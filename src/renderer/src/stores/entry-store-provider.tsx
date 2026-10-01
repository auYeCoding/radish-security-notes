import type { ReactNode } from "react";

import { EntryStoreContext } from "./entry-store-context";
import type { EntryStore } from "./entry-store";

/**
 * 条目 store Provider 的属性.
 */
interface EntryStoreProviderProps {
  /**
   * 要注入的条目 store.
   */
  readonly store: EntryStore;
  /**
   * 子节点.
   */
  readonly children: ReactNode;
}

/**
 * 把条目 store 注入其下的组件树.
 * @param props 组件属性.
 * @returns 包裹子节点的 Provider.
 */
export function EntryStoreProvider(
  props: EntryStoreProviderProps,
): React.JSX.Element {
  return (
    <EntryStoreContext.Provider value={props.store}>
      {props.children}
    </EntryStoreContext.Provider>
  );
}
