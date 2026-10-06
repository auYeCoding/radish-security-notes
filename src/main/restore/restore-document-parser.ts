import { MAX_TRANSFER_ENTRIES } from "@shared/data-transfer/transfer-limits";
import {
  restoreProblem,
  type RestoreProblemSection,
} from "@shared/restore/restore-problem";
import {
  restoreFailed,
  restoreSucceeded,
  type RestoreFailure,
  type RestoreResult,
} from "@shared/restore/restore-result";
import type { z } from "zod";

import {
  customTypeDocumentSchema,
  entryDocumentSchema,
  folderDocumentSchema,
  tagDocumentSchema,
  vaultDocumentShapeSchema,
} from "./restore-document-schemas";
import type { RestoreVaultDocument } from "./restore-backup-types";

/**
 * 内容不合规的失败结果.
 * @param section 问题所在的区段.
 * @param position 区段里出问题的是第几项, 从 1 起.
 * @returns 失败结果.
 */
function shapeFailure(
  section: RestoreProblemSection,
  position?: number,
): RestoreFailure {
  return restoreFailed(
    "invalid-content",
    restoreProblem(section, "wrong-shape", position),
  );
}

/**
 * 逐项按结构校验一个区段, 出问题时能指出是第几项.
 * @param section 区段.
 * @param items 区段里未经校验的项.
 * @param schema 每一项的结构.
 * @returns 校验后的项; 有一项不合规时为失败结果.
 */
function parseSection<Item>(
  section: RestoreProblemSection,
  items: readonly unknown[],
  schema: z.ZodType<Item>,
): RestoreResult<Item[]> {
  const parsed: Item[] = [];
  for (const [index, item] of items.entries()) {
    const result = schema.safeParse(item);
    if (!result.success) {
      return shapeFailure(section, index + 1);
    }
    parsed.push(result.data);
  }
  return restoreSucceeded(parsed);
}

/**
 * 把保险库数据文件的字节解析成 JSON, 不是合法的 JSON 时返回 undefined.
 * @param bytes 保险库数据文件的字节.
 * @returns 解析出的值.
 */
function parseJson(bytes: Buffer): unknown {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    return undefined;
  }
}

/**
 * 按结构解析保险库数据文件: 先看顶层四个区段, 条目个数超过上限就在逐项校验前拒绝, 再逐项校验.
 * 只管结构, 取值是否合规由各校验器负责.
 * @param bytes 保险库数据文件的字节.
 * @returns 结构合规的保险库数据; 失败时为失败结果.
 */
export function parseVaultDocument(
  bytes: Buffer,
): RestoreResult<RestoreVaultDocument> {
  const top = vaultDocumentShapeSchema.safeParse(parseJson(bytes));
  if (!top.success) {
    return shapeFailure("archive");
  }
  if (top.data.entries.length > MAX_TRANSFER_ENTRIES) {
    return restoreFailed(
      "limit-exceeded",
      restoreProblem("entries", "too-many-entries"),
    );
  }
  const folders = parseSection(
    "folders",
    top.data.folders,
    folderDocumentSchema,
  );
  if (!folders.ok) {
    return folders;
  }
  const tags = parseSection("tags", top.data.tags, tagDocumentSchema);
  if (!tags.ok) {
    return tags;
  }
  const customEntryTypes = parseSection(
    "customTypes",
    top.data.customEntryTypes,
    customTypeDocumentSchema,
  );
  if (!customEntryTypes.ok) {
    return customEntryTypes;
  }
  const entries = parseSection(
    "entries",
    top.data.entries,
    entryDocumentSchema,
  );
  if (!entries.ok) {
    return entries;
  }
  return restoreSucceeded({
    folders: folders.value,
    tags: tags.value,
    customEntryTypes: customEntryTypes.value,
    entries: entries.value,
  });
}
