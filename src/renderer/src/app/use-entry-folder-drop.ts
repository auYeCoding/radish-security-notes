import { useCallback } from "react";

import { resolveBatchDrop } from "@shared/batch/batch-drop-target";
import { resolveEntryDrop } from "@shared/folders/folder-drop-target";

import { useBatchOperations } from "@renderer/stores/use-batch-operations";
import { useEntryStore } from "@renderer/stores/use-entry-store";
import { useMoveEntryToFolder } from "@renderer/stores/use-move-entry-to-folder";

import type { BatchOfDragSource } from "./entry-folder-announcements";

/**
 * 取得把拖拽的条目放进文件夹的方法: 被拖的条目属于整批 (已勾选) 时, 把整批里尚未在目标里的条目
 * 经批量接口一次放进去; 否则只放这一个条目. 条目已经在目标里时什么都不做; 放入失败时不打扰
 * 用户, 条目留在原处.
 * @param batchOf 取拖拽源带走的整批条目的方法.
 * @returns 放下时的回调, 参数是拖拽源与放置目标的编号.
 */
export function useEntryFolderDrop(
  batchOf: BatchOfDragSource,
): (sourceId: string, targetId: string) => void {
  const moveEntry = useMoveEntryToFolder();
  const operations = useBatchOperations();
  const entries = useEntryStore((state) => state.entries);
  return useCallback(
    (sourceId, targetId) => {
      const batch = batchOf(sourceId);
      if (batch !== undefined) {
        const batchDrop = resolveBatchDrop(entries, batch, targetId);
        if (batchDrop !== undefined) {
          void operations.moveEntries(batchDrop.entryIds, batchDrop.folderId);
        }
        return;
      }
      const drop = resolveEntryDrop(entries, sourceId, targetId);
      if (drop !== undefined) {
        void moveEntry(drop.entryId, drop.folderId);
      }
    },
    [batchOf, entries, operations, moveEntry],
  );
}
