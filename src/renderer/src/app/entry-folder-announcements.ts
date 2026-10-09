import type { EntrySummary } from "@shared/entries/entry-types";
import type { FolderSummary } from "@shared/folders/folder-types";
import type { TFunction } from "i18next";

import type { DragDropAnnouncements } from "@renderer/lib/drag-drop/drag-drop-provider";

/**
 * 取拖拽源带走的整批条目, 被拖的条目不属于整批时为 undefined.
 */
export type BatchOfDragSource = (
  sourceId: string,
) => readonly string[] | undefined;

/**
 * 播报文案里与拖拽对象有关的取值: 单个条目是名称 (`name`), 整批是条目数 (`count`).
 */
type DragSubjectValues = Readonly<Record<string, string | number>>;

/**
 * 播报里的拖拽对象: 一个条目, 或一批条目.
 */
interface DragSubject {
  /**
   * 文案键的后缀, 单个条目为空串, 整批为 "Batch".
   */
  readonly suffix: "" | "Batch";
  /**
   * 文案里的取值.
   */
  readonly values: DragSubjectValues;
}

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
 * 判断拖拽对象是一个条目还是一批条目, 给出播报用的文案键后缀与取值.
 * @param entries 全部条目摘要.
 * @param sourceId 被拖拽的条目编号.
 * @param batchOf 取拖拽源带走的整批条目的方法.
 * @returns 拖拽对象.
 */
function subjectOf(
  entries: readonly EntrySummary[],
  sourceId: string,
  batchOf: BatchOfDragSource,
): DragSubject {
  const batch = batchOf(sourceId);
  return batch === undefined
    ? { suffix: "", values: { name: entryNameOf(entries, sourceId) } }
    : { suffix: "Batch", values: { count: batch.length } };
}

/**
 * 生成拖拽过程中跟随指针的预览文字: 单个条目是名称, 整批是 "N 个条目".
 * @param entries 全部条目摘要.
 * @param sourceId 被拖拽的条目编号.
 * @param batchOf 取拖拽源带走的整批条目的方法.
 * @param translate 翻译函数.
 * @returns 预览文字.
 */
export function dragPreviewLabelOf(
  entries: readonly EntrySummary[],
  sourceId: string,
  batchOf: BatchOfDragSource,
  translate: TFunction,
): string {
  const batch = batchOf(sourceId);
  return batch === undefined
    ? entryNameOf(entries, sourceId)
    : translate("dragDrop.previewBatch", { count: batch.length });
}

/**
 * 按放置目标编号取目标的名称, 即目标文件夹的名称.
 * @param folders 全部文件夹.
 * @param targetId 放置目标编号.
 * @returns 目标名称, 找不到时为空串.
 */
function targetNameOf(
  folders: readonly FolderSummary[],
  targetId: string,
): string {
  return folders.find((folder) => folder.id === targetId)?.name ?? "";
}

/**
 * 生成把条目拖进文件夹时给读屏软件的播报文字, 含条目与文件夹的名称; 拖的是整批条目时写条目数.
 * @param entries 全部条目摘要.
 * @param folders 全部文件夹.
 * @param translate 翻译函数.
 * @param batchOf 取拖拽源带走的整批条目的方法.
 * @returns 播报文字生成方法.
 */
export function createEntryFolderAnnouncements(
  entries: readonly EntrySummary[],
  folders: readonly FolderSummary[],
  translate: TFunction,
  batchOf: BatchOfDragSource,
): DragDropAnnouncements {
  const subject = (sourceId: string): DragSubject =>
    subjectOf(entries, sourceId, batchOf);
  return {
    pickedUp: (sourceId) => {
      const { suffix, values } = subject(sourceId);
      return translate(`dragDrop.pickedUp${suffix}`, values);
    },
    movedOver: (sourceId, targetId) => {
      const { suffix, values } = subject(sourceId);
      return targetId === undefined
        ? translate(`dragDrop.movedOverNothing${suffix}`, values)
        : translate(`dragDrop.movedOver${suffix}`, {
            ...values,
            target: targetNameOf(folders, targetId),
          });
    },
    dropped: (sourceId, targetId) => {
      const { suffix, values } = subject(sourceId);
      return targetId === undefined
        ? translate(`dragDrop.droppedNowhere${suffix}`, values)
        : translate(`dragDrop.dropped${suffix}`, {
            ...values,
            target: targetNameOf(folders, targetId),
          });
    },
    cancelled: (sourceId) => {
      const { suffix, values } = subject(sourceId);
      return translate(`dragDrop.cancelled${suffix}`, values);
    },
  };
}
