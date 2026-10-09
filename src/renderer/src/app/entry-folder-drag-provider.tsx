import { useCallback, useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { batchOfDragSource } from "@shared/batch/batch-drop-target";

import { DragPreview } from "@renderer/components/drag-preview";
import { DragDropProvider } from "@renderer/lib/drag-drop/drag-drop-provider";
import { useBatchSelectionStoreApi } from "@renderer/stores/use-batch-selection-store";
import { useEntryStore } from "@renderer/stores/use-entry-store";
import { useFolderStore } from "@renderer/stores/use-folder-store";

import {
  createEntryFolderAnnouncements,
  dragPreviewLabelOf,
} from "./entry-folder-announcements";
import { useEntryFolderDrop } from "./use-entry-folder-drop";

/**
 * 条目拖放根的属性.
 */
interface EntryFolderDragProviderProps {
  /**
   * 条目列表与侧栏所在的子树.
   */
  readonly children: ReactNode;
}

/**
 * 把条目拖进文件夹的拖放根: 条目放在文件夹行上时, 经文件夹 store 把它放进去并更新列表;
 * 被拖的条目已勾选时, 全部已勾选条目作为整批一起放进去 (经批量接口, 一个事务), 预览与读屏播报写
 * 条目数. 条目已在目标里则什么都不做. 放入失败时不打扰用户, 条目留在原处. 勾选只在拖拽发生时才从
 * 批量选中 store 里读取, 不订阅它: 订阅会让每次勾选都重新渲染拖放根, 进而让整张列表的拖拽源跟着
 * 重新渲染.
 * @param props 组件属性.
 * @returns 拖放根元素.
 */
export function EntryFolderDragProvider(
  props: EntryFolderDragProviderProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const entries = useEntryStore((state) => state.entries);
  const folders = useFolderStore((state) => state.folders);
  const selectionStore = useBatchSelectionStoreApi();
  const batchOf = useCallback(
    (sourceId: string) =>
      batchOfDragSource(selectionStore.getState().checkedIds, sourceId),
    [selectionStore],
  );
  const announcements = useMemo(
    () => createEntryFolderAnnouncements(entries, folders, t, batchOf),
    [entries, folders, t, batchOf],
  );
  const handleDrop = useEntryFolderDrop(batchOf);
  return (
    <DragDropProvider
      announcements={announcements}
      instructions={t("dragDrop.instructions")}
      renderPreview={(sourceId) => (
        <DragPreview
          label={dragPreviewLabelOf(entries, sourceId, batchOf, t)}
        />
      )}
      onDrop={handleDrop}
    >
      {props.children}
    </DragDropProvider>
  );
}
