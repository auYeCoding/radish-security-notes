import type { ExportScope } from "@shared/export/export-request";

import type { AttachmentRow } from "../../attachments/attachment-repository";
import type { EntryRecord } from "../../entries/entry-repository";
import { loadEntryTypeCatalog } from "../../entry-types/entry-type-catalog";
import { listCustomEntryTypes } from "../../entry-types/custom-entry-type-reader";
import { listFolders } from "../../folders/folder-repository";
import { listTagIdsByEntry } from "../../tags/entry-tag-repository";
import { listTags } from "../../tags/tag-repository";
import type { VaultOrm } from "../../vault/database/drizzle-adapter";
import type {
  ExportAttachment,
  ExportDataset,
  ExportEntry,
} from "./export-dataset";
import { redactEntry } from "./export-redaction";
import {
  selectAllAttachmentRows,
  selectAllEntryRows,
} from "./export-row-queries";
import {
  restrictToReferenced,
  selectRowsInScope,
  type ReferencedLabels,
} from "./export-scope-resolver";

/**
 * 读取数据集时用户选的内容选项.
 */
export interface ExportDatasetOptions {
  /**
   * 导出的范围.
   */
  readonly scope: ExportScope;
  /**
   * 是否包含保密字段与 TOTP 密钥.
   */
  readonly includeSecrets: boolean;
  /**
   * 是否要把附件内容写进文件.
   */
  readonly includeAttachments: boolean;
}

/**
 * 把附件元数据行按所属条目分组, 每组保持添加顺序.
 * @param rows 附件元数据行, 已按添加顺序排列.
 * @returns 条目编号到附件元数据的映射.
 */
function groupAttachmentsByEntry(
  rows: readonly AttachmentRow[],
): Map<string, ExportAttachment[]> {
  const grouped = new Map<string, ExportAttachment[]>();
  for (const row of rows) {
    const attachment = {
      id: row.id,
      name: row.name,
      size: row.size,
      position: row.position,
    };
    const own = grouped.get(row.entryId);
    if (own === undefined) {
      grouped.set(row.entryId, [attachment]);
    } else {
      own.push(attachment);
    }
  }
  return grouped;
}

/**
 * 把条目表里的一行转成数据集里的条目, 内容保持库里存的样子.
 * @param record 条目所在的行.
 * @param tagIds 条目带的标签编号, 按选择顺序排列.
 * @param attachments 条目的附件元数据.
 * @returns 数据集里的条目.
 */
function toExportEntry(
  record: EntryRecord,
  tagIds: readonly string[],
  attachments: readonly ExportAttachment[],
): ExportEntry {
  return {
    id: record.id,
    typeKey: record.type,
    name: record.name,
    fields: record.fields,
    notes: record.notes,
    notesFormat: record.notesFormat,
    customFields: record.customFields,
    totp: record.totp ?? undefined,
    folderId: record.folderId ?? undefined,
    tagIds,
    createdAt: record.createdAt,
    attachments,
  };
}

/**
 * 读取全部文件夹, 标签与自定义类型.
 * @param orm 已解锁数据库的查询入口或事务.
 * @returns 全部文件夹, 标签与自定义类型.
 */
function readAllLabels(orm: VaultOrm): ReferencedLabels {
  return {
    folders: listFolders(orm).map((folder) => ({
      id: folder.id,
      name: folder.name,
    })),
    tags: listTags(orm).map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    })),
    customEntryTypes: listCustomEntryTypes(orm),
  };
}

/**
 * 在一个只读事务里读出范围内的全部文本数据, 得到序列化器共用的数据集. 事务让条目, 标签,
 * 附件元数据看到同一个时刻的库, 读取不改动库里任何数据. 附件内容不在这里读, 写入时才逐个读.
 * @param orm 已解锁数据库的查询入口.
 * @param options 范围与内容选项.
 * @returns 数据集, 不含保密字段时保密内容已去掉.
 */
export function readExportDataset(
  orm: VaultOrm,
  options: ExportDatasetOptions,
): ExportDataset {
  return orm.transaction((transaction) => {
    const catalog = loadEntryTypeCatalog(transaction);
    const tagIdsByEntry = listTagIdsByEntry(transaction);
    const attachmentsByEntry = groupAttachmentsByEntry(
      selectAllAttachmentRows(transaction),
    );
    const entries = selectRowsInScope(
      selectAllEntryRows(transaction),
      options.scope,
    ).map((record) =>
      toExportEntry(
        record,
        tagIdsByEntry.get(record.id) ?? [],
        attachmentsByEntry.get(record.id) ?? [],
      ),
    );
    const allLabels = readAllLabels(transaction);
    const isFullScope = options.scope.kind === "all";
    const labels = isFullScope
      ? allLabels
      : restrictToReferenced(entries, allLabels);
    return {
      isFullScope,
      includesSecrets: options.includeSecrets,
      includesAttachments: options.includeAttachments,
      ...labels,
      entries: options.includeSecrets
        ? entries
        : entries.map((entry) => redactEntry(entry, catalog)),
      catalog,
    };
  });
}
