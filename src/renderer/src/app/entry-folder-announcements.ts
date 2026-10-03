import type { EntrySummary } from "@shared/entries/entry-types";
import { folderIdFromDropTarget } from "@shared/folders/folder-drop-target";
import type { FolderSummary } from "@shared/folders/folder-types";
import type { TFunction } from "i18next";

import type { DragDropAnnouncements } from "@renderer/lib/drag-drop/drag-drop-provider";

/**
 * 按编号取条目名称.
 * @param entries 全部条目摘要.
 * @param entryId 条目编号.
 * @returns 条目名称, 找不到时为空串.
 */
export function entryNameOf(
  entries: readonly EntrySummary[],
  entryId: string,
): string {
  return entries.find((entry) => entry.id === entryId)?.name ?? "";
}

/**
 * 按放置目标编号取目标的名称: 文件夹的名称, 或 "未分类".
 * @param folders 全部文件夹.
 * @param targetId 放置目标编号.
 * @param translate 翻译函数.
 * @returns 目标名称, 找不到时为空串.
 */
function targetNameOf(
  folders: readonly FolderSummary[],
  targetId: string,
  translate: TFunction,
): string {
  const folderId = folderIdFromDropTarget(targetId);
  return folderId === undefined
    ? translate("folderPane.uncategorized")
    : (folders.find((folder) => folder.id === folderId)?.name ?? "");
}

/**
 * 生成把条目拖进文件夹时给读屏软件的播报文字, 含条目与文件夹的名称.
 * @param entries 全部条目摘要.
 * @param folders 全部文件夹.
 * @param translate 翻译函数.
 * @returns 播报文字生成方法.
 */
export function createEntryFolderAnnouncements(
  entries: readonly EntrySummary[],
  folders: readonly FolderSummary[],
  translate: TFunction,
): DragDropAnnouncements {
  return {
    pickedUp: (sourceId) =>
      translate("dragDrop.pickedUp", { name: entryNameOf(entries, sourceId) }),
    movedOver: (sourceId, targetId) =>
      targetId === undefined
        ? translate("dragDrop.movedOverNothing", {
            name: entryNameOf(entries, sourceId),
          })
        : translate("dragDrop.movedOver", {
            name: entryNameOf(entries, sourceId),
            target: targetNameOf(folders, targetId, translate),
          }),
    dropped: (sourceId, targetId) =>
      targetId === undefined
        ? translate("dragDrop.droppedNowhere", {
            name: entryNameOf(entries, sourceId),
          })
        : translate("dragDrop.dropped", {
            name: entryNameOf(entries, sourceId),
            target: targetNameOf(folders, targetId, translate),
          }),
    cancelled: (sourceId) =>
      translate("dragDrop.cancelled", {
        name: entryNameOf(entries, sourceId),
      }),
  };
}
