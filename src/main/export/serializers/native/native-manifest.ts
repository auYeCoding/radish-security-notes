import type { ExportDataset } from "../../dataset/export-dataset";
import type { NativeManifest } from "./native-format-types";
import {
  NATIVE_FORMAT_ID,
  NATIVE_FORMAT_VERSION,
} from "./native-format-version";

/**
 * 数据集里要写进文件的附件个数: 文件不含附件时为 0.
 * @param dataset 数据集.
 * @returns 要写进文件的附件个数.
 */
export function countNativeAttachments(dataset: ExportDataset): number {
  if (!dataset.includesAttachments) {
    return 0;
  }
  return dataset.entries.reduce(
    (total, entry) => total + entry.attachments.length,
    0,
  );
}

/**
 * 构造 `manifest.json` 的内容.
 * @param dataset 数据集.
 * @param createdAt 导出开始的时刻.
 * @returns 清单内容.
 */
export function buildNativeManifest(
  dataset: ExportDataset,
  createdAt: Date,
): NativeManifest {
  return {
    format: NATIVE_FORMAT_ID,
    version: NATIVE_FORMAT_VERSION,
    createdAt: createdAt.toISOString(),
    scope: dataset.isFullScope ? "all" : "selection",
    includesSecrets: dataset.includesSecrets,
    includesAttachments: dataset.includesAttachments,
    counts: {
      entries: dataset.entries.length,
      folders: dataset.folders.length,
      tags: dataset.tags.length,
      customEntryTypes: dataset.customEntryTypes.length,
      attachments: countNativeAttachments(dataset),
    },
  };
}
