import { INITIAL_BATCH_SELECTION_STATE } from "@renderer/stores/batch-selection-state";
import { INITIAL_ENTRY_STATE } from "@renderer/stores/entry-state";
import { INITIAL_ENTRY_TYPE_STATE } from "@renderer/stores/entry-type-state";
import { INITIAL_FOLDER_STATE } from "@renderer/stores/folder-state";
import { INITIAL_TAG_STATE } from "@renderer/stores/tag-state";

import type { WorkspaceStores } from "./create-workspace-stores";

/**
 * 工作区每个 store 的重置函数表. 键必须与 `WorkspaceStores` 一一对应, 新增 store 而没有在这里挂接
 * 重置函数时类型检查失败, 锁定后就不会漏清.
 */
type WorkspaceStoreResets = {
  readonly [Key in keyof WorkspaceStores]: (
    store: WorkspaceStores[Key],
  ) => void;
};

/**
 * 各 store 回到初始状态的重置函数: 条目 (列表, 选中详情含密码, 搜索, 入口, 已选标签), 自定义条目
 * 类型, 文件夹, 标签与批量选中, 都整体回写初始状态.
 */
const WORKSPACE_STORE_RESETS: WorkspaceStoreResets = {
  entryStore: (store) => store.setState(INITIAL_ENTRY_STATE),
  entryTypeStore: (store) => store.setState(INITIAL_ENTRY_TYPE_STATE),
  folderStore: (store) => store.setState(INITIAL_FOLDER_STATE),
  tagStore: (store) => store.setState(INITIAL_TAG_STATE),
  batchSelectionStore: (store) => store.setState(INITIAL_BATCH_SELECTION_STATE),
};

/**
 * 重置工作区里的一个 store.
 * @param stores 工作区的全部 store.
 * @param key 要重置的 store 的键.
 */
function resetStore<Key extends keyof WorkspaceStores>(
  stores: WorkspaceStores,
  key: Key,
): void {
  WORKSPACE_STORE_RESETS[key](stores[key]);
}

/**
 * 把工作区的全部 store 重置回初始状态, 锁定保险库时调用, 之后内存里不再有条目, 文件夹, 标签,
 * 自定义类型, 选中详情, 搜索关键字与批量勾选. 这是重置的唯一入口.
 * @param stores 工作区的全部 store.
 */
export function resetWorkspaceStores(stores: WorkspaceStores): void {
  const keys = Object.keys(WORKSPACE_STORE_RESETS) as Array<
    keyof WorkspaceStores
  >;
  keys.forEach((key) => resetStore(stores, key));
}
