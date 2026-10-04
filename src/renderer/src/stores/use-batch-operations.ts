import { useMemo } from "react";

import {
  createBatchOperations,
  type BatchOperations,
} from "./batch-operations";
import { useBatchBridge } from "./use-batch-bridge";
import { useBatchSelectionStore } from "./use-batch-selection-store";
import { useEntryStore } from "./use-entry-store";

/**
 * 取得四种批量操作: 批量接口, 条目 store 与批量选中 store 串在一起, 引用在三者不变时保持稳定.
 * @returns 批量操作.
 */
export function useBatchOperations(): BatchOperations {
  const bridge = useBatchBridge();
  const applyBatchRemoval = useEntryStore((state) => state.applyBatchRemoval);
  const applyBatchFolder = useEntryStore((state) => state.applyBatchFolder);
  const applyBatchTags = useEntryStore((state) => state.applyBatchTags);
  const refresh = useEntryStore((state) => state.refresh);
  const clearChecked = useBatchSelectionStore((state) => state.clear);
  return useMemo(
    () =>
      createBatchOperations({
        bridge,
        entryActions: {
          applyBatchRemoval,
          applyBatchFolder,
          applyBatchTags,
          refresh,
        },
        clearChecked,
      }),
    [
      bridge,
      applyBatchRemoval,
      applyBatchFolder,
      applyBatchTags,
      refresh,
      clearChecked,
    ],
  );
}
