import type { ExportDataset, ExportEntry } from "../../dataset/export-dataset";
import type { JsonDocumentParts } from "../json-document-stream";
import type { NativeEntryDocument } from "./native-format-types";
import { nativeAttachmentPath } from "./native-format-version";

/**
 * 把数据集里的一个条目转成 `vault.json` 里的条目. 内容保持库里存的样子, 文件不含附件时附件列表为空.
 * @param entry 数据集里的条目.
 * @param includesAttachments 文件是否含附件.
 * @returns `vault.json` 里的条目.
 */
export function toNativeEntryDocument(
  entry: ExportEntry,
  includesAttachments: boolean,
): NativeEntryDocument {
  return {
    id: entry.id,
    type: entry.typeKey,
    name: entry.name,
    fields: entry.fields,
    notes: entry.notes,
    notesFormat: entry.notesFormat,
    customFields: entry.customFields.map((field) => ({
      id: field.id,
      label: field.label,
      value: field.value,
      isHidden: field.isHidden,
    })),
    totp:
      entry.totp === undefined
        ? null
        : {
            secret: entry.totp.secret,
            algorithm: entry.totp.algorithm,
            digits: entry.totp.digits,
            periodSeconds: entry.totp.periodSeconds,
          },
    folderId: entry.folderId ?? null,
    tagIds: entry.tagIds,
    createdAt: entry.createdAt,
    attachments: includesAttachments
      ? entry.attachments.map((attachment) => ({
          id: attachment.id,
          name: attachment.name,
          size: attachment.size,
          position: attachment.position,
          path: nativeAttachmentPath(attachment.id),
        }))
      : [],
  };
}

/**
 * 逐个生成 `vault.json` 里的条目.
 * @param dataset 数据集.
 * @yields `vault.json` 里的条目, 按创建先后升序.
 */
function* nativeEntryDocuments(
  dataset: ExportDataset,
): Generator<NativeEntryDocument> {
  for (const entry of dataset.entries) {
    yield toNativeEntryDocument(entry, dataset.includesAttachments);
  }
}

/**
 * 构造 `vault.json` 的组成: 先是文件夹, 标签与自定义类型, 最后是逐个生成的条目数组.
 * @param dataset 数据集.
 * @returns 文档的组成.
 */
export function buildNativeVaultParts(
  dataset: ExportDataset,
): JsonDocumentParts {
  return {
    headProperties: [
      [
        "folders",
        dataset.folders.map((folder) => ({ id: folder.id, name: folder.name })),
      ],
      [
        "tags",
        dataset.tags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          color: tag.color,
        })),
      ],
      [
        "customEntryTypes",
        dataset.customEntryTypes.map((type) => ({
          id: type.id,
          key: type.key,
          name: type.name,
          fields: type.fields,
        })),
      ],
    ],
    listName: "entries",
    items: nativeEntryDocuments(dataset),
  };
}
