import type { CustomEntryType } from "@shared/entries/custom-types/custom-entry-type-types";
import type { ExportScope } from "@shared/export/export-request";

import type { ExportEntry, ExportFolder, ExportTag } from "./export-dataset";

/**
 * 范围里能按编号确定的条目所在的行需要的最小形状.
 */
interface IdentifiedRow {
  /**
   * 行的编号.
   */
  readonly id: string;
}

/**
 * 只留下被条目用到的文件夹, 标签与自定义类型.
 */
export interface ReferencedLabels {
  /**
   * 被条目用到的文件夹.
   */
  readonly folders: readonly ExportFolder[];
  /**
   * 被条目用到的标签.
   */
  readonly tags: readonly ExportTag[];
  /**
   * 被条目用到的自定义类型.
   */
  readonly customEntryTypes: readonly CustomEntryType[];
}

/**
 * 按范围留下条目所在的行: 全部范围保留所有行, 指定条目的范围只留编号在其中的行. 保持传入的
 * 先后顺序, 库里已不存在的编号被忽略, 重复编号只算一次.
 * @param rows 全部条目所在的行.
 * @param scope 导出的范围.
 * @returns 范围内的行.
 */
export function selectRowsInScope<Row extends IdentifiedRow>(
  rows: readonly Row[],
  scope: ExportScope,
): Row[] {
  if (scope.kind === "all") {
    return [...rows];
  }
  const wanted = new Set(scope.entryIds);
  return rows.filter((row) => wanted.has(row.id));
}

/**
 * 导出子集时只留下被这些条目用到的文件夹, 标签与自定义类型, 保持各自原来的先后顺序.
 * @param entries 要导出的条目.
 * @param labels 全部文件夹, 标签与自定义类型.
 * @returns 只含被引用项的文件夹, 标签与自定义类型.
 */
export function restrictToReferenced(
  entries: readonly ExportEntry[],
  labels: ReferencedLabels,
): ReferencedLabels {
  const folderIds = new Set(entries.map((entry) => entry.folderId));
  const tagIds = new Set(entries.flatMap((entry) => entry.tagIds));
  const typeKeys = new Set(entries.map((entry) => entry.typeKey));
  return {
    folders: labels.folders.filter((folder) => folderIds.has(folder.id)),
    tags: labels.tags.filter((tag) => tagIds.has(tag.id)),
    customEntryTypes: labels.customEntryTypes.filter((type) =>
      typeKeys.has(type.key),
    ),
  };
}
