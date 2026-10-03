import type { ReactNode } from "react";

import { TagStoreContext } from "./tag-store-context";
import type { TagStore } from "./tag-store";

/**
 * 标签 store Provider 的属性.
 */
interface TagStoreProviderProps {
  /**
   * 要注入的标签 store.
   */
  readonly store: TagStore;
  /**
   * 子节点.
   */
  readonly children: ReactNode;
}

/**
 * 把标签 store 注入其下的组件树.
 * @param props 组件属性.
 * @returns 包裹子节点的 Provider.
 */
export function TagStoreProvider(
  props: TagStoreProviderProps,
): React.JSX.Element {
  return (
    <TagStoreContext.Provider value={props.store}>
      {props.children}
    </TagStoreContext.Provider>
  );
}
