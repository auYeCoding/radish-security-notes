import { useEffect } from "react";

import { useBatchSelectionStore } from "./use-batch-selection-store";
import { useVisibleEntries } from "./use-visible-entries";

/**
 * 让批量选中跟随当前可见列表: 可见列表变化后 (切换入口, 选标签, 搜索结果到达, 条目增删改),
 * 已勾选而不再可见的条目自动取消勾选, 仍可见的保留. 要挂在始终渲染的组件里.
 */
export function useRetainVisibleChecked(): void {
  const visible = useVisibleEntries();
  const retain = useBatchSelectionStore((state) => state.retain);
  useEffect(() => {
    retain(visible.map((entry) => entry.id));
  }, [visible, retain]);
}
