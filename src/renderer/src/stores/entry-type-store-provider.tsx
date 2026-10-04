import type { ReactNode } from "react";

import { EntryTypeStoreContext } from "./entry-type-store-context";
import type { EntryTypeStore } from "./entry-type-store";

/**
 * 自定义条目类型 store Provider 的属性.
 */
interface EntryTypeStoreProviderProps {
  /**
   * 要注入的自定义条目类型 store.
   */
  readonly store: EntryTypeStore;
  /**
   * 子节点.
   */
  readonly children: ReactNode;
}

/**
 * 把自定义条目类型 store 注入其下的组件树.
 * @param props 组件属性.
 * @returns 包裹子节点的 Provider.
 */
export function EntryTypeStoreProvider(
  props: EntryTypeStoreProviderProps,
): React.JSX.Element {
  return (
    <EntryTypeStoreContext.Provider value={props.store}>
      {props.children}
    </EntryTypeStoreContext.Provider>
  );
}
