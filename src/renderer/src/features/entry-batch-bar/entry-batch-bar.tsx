import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  checkedVisibleIds,
  selectAllStateOf,
} from "@shared/batch/batch-selection";

import { useBatchSelectionStore } from "@renderer/stores/use-batch-selection-store";
import { useEntryStore } from "@renderer/stores/use-entry-store";
import { useRetainVisibleChecked } from "@renderer/stores/use-retain-visible-checked";
import { useVisibleEntries } from "@renderer/stores/use-visible-entries";

import { BatchBarActions } from "./batch-bar-actions";
import { BatchFailureNotice } from "./batch-failure-notice";
import { BatchSelectAllCheckbox } from "./batch-select-all-checkbox";
import { BatchSelectionSummary } from "./batch-selection-summary";
import { useBatchRun } from "./use-batch-run";

/**
 * 条目列表窗格标题行下方的常驻选择栏: 固定高度, 左侧是全选框 (部分选中时半选) 与文字, 没有勾选时
 * 文字是 "全选", 勾选后显示 "已选 N 项" 并在右侧出现批量操作按钮; 批量操作失败时下方显示失败提示.
 * 读取未完成或当前没有可见条目时不显示, 但仍让批量选中跟随可见列表, 已不可见的条目自动取消勾选.
 * 全选, 反选与批量操作都只作用于当前可见的条目.
 * @returns 选择栏元素, 不显示时为 null.
 */
export function EntryBatchBar(): React.JSX.Element | null {
  const { t } = useTranslation();
  useRetainVisibleChecked();
  const visible = useVisibleEntries();
  const loadStatus = useEntryStore((state) => state.loadStatus);
  const checkedIds = useBatchSelectionStore((state) => state.checkedIds);
  const toggleAll = useBatchSelectionStore((state) => state.toggleAll);
  const invert = useBatchSelectionStore((state) => state.invert);
  const batchRun = useBatchRun();
  const visibleIds = useMemo(() => visible.map((entry) => entry.id), [visible]);
  if (loadStatus !== "ready" || visibleIds.length === 0) {
    return null;
  }
  const entryIds = checkedVisibleIds(checkedIds, visibleIds);
  return (
    <>
      <div
        role="group"
        aria-label={t("batch.barLabel")}
        className="flex h-10 shrink-0 items-center gap-2 border-b border-s-2 border-border border-s-transparent pe-2 ps-3"
      >
        <BatchSelectAllCheckbox
          state={selectAllStateOf(checkedIds, visibleIds)}
          onToggle={() => toggleAll(visibleIds)}
        />
        <BatchSelectionSummary count={entryIds.length} />
        {entryIds.length > 0 && (
          <BatchBarActions
            entryIds={entryIds}
            isRunning={batchRun.isRunning}
            run={batchRun.run}
            onInvert={() => invert(visibleIds)}
          />
        )}
      </div>
      {batchRun.failureMessage !== undefined && (
        <BatchFailureNotice
          message={batchRun.failureMessage}
          onDismiss={batchRun.dismiss}
        />
      )}
    </>
  );
}
