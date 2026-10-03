import type { ReactNode } from "react";

import { FolderStoreContext } from "./folder-store-context";
import type { FolderStore } from "./folder-store";

/**
 * 文件夹 store Provider 的属性.
 */
interface FolderStoreProviderProps {
  /**
   * 要注入的文件夹 store.
   */
  readonly store: FolderStore;
  /**
   * 子节点.
   */
  readonly children: ReactNode;
}

/**
 * 把文件夹 store 注入其下的组件树.
 * @param props 组件属性.
 * @returns 包裹子节点的 Provider.
 */
export function FolderStoreProvider(
  props: FolderStoreProviderProps,
): React.JSX.Element {
  return (
    <FolderStoreContext.Provider value={props.store}>
      {props.children}
    </FolderStoreContext.Provider>
  );
}
