import type { ExportLossItem } from "@shared/export/export-loss-reasons";

import type { ExportDataset } from "../../dataset/export-dataset";
import { createChunkPacer } from "../export-chunk-pacer";
import type {
  ExportPayload,
  ExportSerializeContext,
  ExportSerializer,
} from "../export-serializer";
import { streamJsonDocument } from "../json-document-stream";
import { readableOfText } from "../text-stream";
import { isMergedIntoLogin, toBitwardenItem } from "./bitwarden-item-mapper";
import { isDowngradedSshKey } from "./bitwarden-ssh-eligibility";
import type { BitwardenItem } from "./bitwarden-types";

/**
 * 统计 Bitwarden JSON 实际带不出的内容, 个数为 0 的原因不列出: 带标签的条目数, 附件个数, 自定义
 * 类型个数, 被并入登录的条目数, 被降级为登录的 SSH 密钥条目数, Markdown 备注的条目数.
 * @param dataset 数据集.
 * @returns 带不出内容的汇总.
 */
function countLosses(dataset: ExportDataset): ExportLossItem[] {
  const { entries } = dataset;
  const losses: ExportLossItem[] = [
    {
      reason: "tags",
      count: entries.filter((entry) => entry.tagIds.length > 0).length,
    },
    {
      reason: "attachments",
      count: entries.reduce(
        (total, entry) => total + entry.attachments.length,
        0,
      ),
    },
    { reason: "customEntryTypes", count: dataset.customEntryTypes.length },
    {
      reason: "mergedTypes",
      count: entries.filter((entry) => isMergedIntoLogin(entry.typeKey)).length,
    },
    {
      reason: "downgradedSshKeys",
      count: entries.filter(isDowngradedSshKey).length,
    },
    {
      reason: "markdownNotes",
      count: entries.filter((entry) => entry.notesFormat === "markdown").length,
    },
  ];
  return losses.filter((loss) => loss.count > 0);
}

/**
 * 逐个生成 Bitwarden 条目.
 * @param dataset 数据集.
 * @param context 序列化用到的外部能力.
 * @yields Bitwarden 条目, 按创建先后升序.
 */
function* bitwardenItems(
  dataset: ExportDataset,
  context: ExportSerializeContext,
): Generator<BitwardenItem> {
  for (const entry of dataset.entries) {
    yield toBitwardenItem(entry, dataset, context.labelOfField);
  }
}

/**
 * Bitwarden JSON (未加密) 的序列化器: `{ encrypted: false, folders, items }`, 条目逐个生成, 每个条目
 * 占一行.
 */
export const bitwardenJsonSerializer: ExportSerializer = {
  key: "bitwardenJson",
  countSteps: (dataset) => dataset.entries.length,
  serialize: (dataset, context): ExportPayload => {
    const pacer = createChunkPacer(context);
    const document = streamJsonDocument(
      {
        headProperties: [
          ["encrypted", false],
          [
            "folders",
            dataset.folders.map((folder) => ({
              id: folder.id,
              name: folder.name,
            })),
          ],
        ],
        listName: "items",
        items: bitwardenItems(dataset, context),
      },
      pacer.tick,
    );
    return {
      stream: readableOfText(document),
      entryCount: dataset.entries.length,
      attachmentCount: 0,
      losses: countLosses(dataset),
    };
  },
};
