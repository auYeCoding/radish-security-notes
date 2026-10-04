import type { ReactNode } from "react";

import type { BatchSelectionStore } from "./batch-selection-store";
import { BatchSelectionStoreContext } from "./batch-selection-store-context";

/**
 * 批量选中 store Provider 的属性.
 */
interface BatchSelectionStoreProviderProps {
  /**
   * 要注入的批量选中 store.
   */
  readonly store: BatchSelectionStore;
  /**
   * 子节点.
   */
  readonly children: ReactNode;
}

/**
 * 把批量选中 store 注入其下的组件树.
 * @param props 组件属性.
 * @returns 包裹子节点的 Provider.
 */
export function BatchSelectionStoreProvider(
  props: BatchSelectionStoreProviderProps,
): React.JSX.Element {
  return (
    <BatchSelectionStoreContext.Provider value={props.store}>
      {props.children}
    </BatchSelectionStoreContext.Provider>
  );
}
