import { ACCOUNT_FIELD_KEY } from "@shared/entries/common-entry-fields";
import type { ExportLossItem } from "@shared/export/export-loss-reasons";

import type { ExportDataset, ExportEntry } from "../../dataset/export-dataset";
import { createChunkPacer } from "../export-chunk-pacer";
import type {
  ExportPayload,
  ExportSerializeContext,
  ExportSerializer,
} from "../export-serializer";
import { readableOfText } from "../text-stream";
import {
  BROWSER_CSV_COLUMNS,
  BROWSER_CSV_PASSWORD_KEY,
  BROWSER_CSV_URL_KEY,
  formatCsvRow,
  toBrowserCsvCells,
} from "./browser-csv-columns";

/**
 * 浏览器密码 CSV 的五列已经带出的类型字段键.
 */
const CARRIED_FIELD_KEYS: ReadonlySet<string> = new Set([
  ACCOUNT_FIELD_KEY,
  BROWSER_CSV_PASSWORD_KEY,
  BROWSER_CSV_URL_KEY,
]);

/**
 * 判断条目的类型是否有密码字段, 没有的条目整条不能写进浏览器密码 CSV.
 * @param entry 条目.
 * @param dataset 数据集, 用来查类型定义.
 * @returns 类型有密码字段时返回 true.
 */
function canCarry(entry: ExportEntry, dataset: ExportDataset): boolean {
  const definition = dataset.catalog.find(entry.typeKey);
  return (
    definition?.fields.some(
      (field) => field.key === BROWSER_CSV_PASSWORD_KEY,
    ) ?? false
  );
}

/**
 * 判断条目有没有五列之外的非空类型字段.
 * @param entry 条目.
 * @returns 有时返回 true.
 */
function hasUncarriedFields(entry: ExportEntry): boolean {
  return Object.entries(entry.fields).some(
    ([key, value]) => !CARRIED_FIELD_KEYS.has(key) && value !== "",
  );
}

/**
 * 统计浏览器密码 CSV 实际带不出的内容, 个数为 0 的原因不列出. 整条跳过的条目只算 "不支持的条目",
 * 不再重复统计它们的其余内容; 附件是全部范围内的附件个数.
 * @param dataset 数据集.
 * @returns 带不出内容的汇总.
 */
function countLosses(dataset: ExportDataset): ExportLossItem[] {
  const carried = dataset.entries.filter((entry) => canCarry(entry, dataset));
  const losses: ExportLossItem[] = [
    {
      reason: "unsupportedEntries",
      count: dataset.entries.length - carried.length,
    },
    {
      reason: "totp",
      count: carried.filter((entry) => entry.totp !== undefined).length,
    },
    {
      reason: "customFields",
      count: carried.filter((entry) => entry.customFields.length > 0).length,
    },
    { reason: "extraFields", count: carried.filter(hasUncarriedFields).length },
    {
      reason: "folders",
      count: carried.filter((entry) => entry.folderId !== undefined).length,
    },
    {
      reason: "tags",
      count: carried.filter((entry) => entry.tagIds.length > 0).length,
    },
    {
      reason: "attachments",
      count: dataset.entries.reduce(
        (total, entry) => total + entry.attachments.length,
        0,
      ),
    },
    {
      reason: "markdownNotes",
      count: carried.filter((entry) => entry.notesFormat === "markdown").length,
    },
  ];
  return losses.filter((loss) => loss.count > 0);
}

/**
 * 逐行生成 CSV 文本: 先是表头, 然后每个能带出的条目一行. 不能带出的条目也算一步进度.
 * @param dataset 数据集.
 * @param context 序列化用到的外部能力.
 * @yields CSV 文本片段.
 */
async function* csvChunks(
  dataset: ExportDataset,
  context: ExportSerializeContext,
): AsyncGenerator<string> {
  const pacer = createChunkPacer(context);
  yield formatCsvRow(BROWSER_CSV_COLUMNS);
  for (const entry of dataset.entries) {
    if (canCarry(entry, dataset)) {
      yield formatCsvRow(toBrowserCsvCells(entry));
    }
    await pacer.tick();
  }
}

/**
 * 浏览器密码 CSV (Chrome 格式) 的序列化器: 表头 `name,url,username,password,note`, UTF-8 无 BOM,
 * 行以 CRLF 结束, 只写有密码字段的条目.
 */
export const browserCsvSerializer: ExportSerializer = {
  key: "browserCsv",
  countSteps: (dataset) => dataset.entries.length,
  serialize: (dataset, context): ExportPayload => ({
    stream: readableOfText(csvChunks(dataset, context)),
    entryCount: dataset.entries.filter((entry) => canCarry(entry, dataset))
      .length,
    attachmentCount: 0,
    losses: countLosses(dataset),
  }),
};
