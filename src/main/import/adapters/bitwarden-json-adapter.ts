import { importFailed, importSucceeded } from "@shared/import/import-result";
import type { NotImportedItem } from "@shared/import/import-reasons";

import type { ChunkObserver } from "../import-progress";
import type {
  ImportedEntryDraft,
  ImportSourceAdapter,
  SourceParseResult,
} from "../source-adapter";
import { mapBitwardenItem } from "./bitwarden-json-item-mapper";
import {
  isJsonRecord,
  readArray,
  readText,
  type JsonRecord,
} from "./json-values";

/**
 * 把 JSON 文本解析成对象.
 * @param text JSON 文本.
 * @returns JSON 对象, 不是合法 JSON 或顶层不是对象时为 undefined.
 */
function parseJsonObject(text: string): JsonRecord | undefined {
  try {
    const value: unknown = JSON.parse(text);
    return isJsonRecord(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * 建文件夹编号到名称的映射.
 * @param data 导出文件的顶层对象.
 * @returns 文件夹编号到名称的映射.
 */
function readFolderNames(data: JsonRecord): ReadonlyMap<string, string> {
  const names = new Map<string, string>();
  for (const folder of readArray(data, "folders")) {
    if (isJsonRecord(folder)) {
      names.set(readText(folder, "id"), readText(folder, "name"));
    }
  }
  return names;
}

/**
 * 检查顶层结构: 加密的导出与组织库导出不支持, 没有 items 数组说明不是 Bitwarden 导出.
 * @param data 导出文件的顶层对象.
 * @returns 失败的结果, 结构合格时为 undefined.
 */
function checkStructure(data: JsonRecord): SourceParseResult | undefined {
  if (data.encrypted === true) {
    return importFailed("encrypted-file");
  }
  if ("collections" in data && !("folders" in data)) {
    return importFailed("organization-export-unsupported");
  }
  return Array.isArray(data.items)
    ? undefined
    : importFailed("format-mismatch");
}

/**
 * Bitwarden JSON 的适配器, 处理个人库的未加密导出: 顶层是 `{ encrypted, folders, items }`, 条目类型
 * 1 登录, 2 安全笔记, 3 卡, 4 身份, 5 SSH 密钥. 加密导出与组织库导出 (有 collections 没有
 * folders) 不支持. 条目不是对象时记为没能解析的行.
 */
export const bitwardenJsonAdapter: ImportSourceAdapter = {
  key: "bitwardenJson",
  parse: async (
    text: string,
    observer: ChunkObserver,
  ): Promise<SourceParseResult> => {
    const data = parseJsonObject(text);
    if (data === undefined) {
      return importFailed("malformed-file");
    }
    const rejected = checkStructure(data);
    if (rejected !== undefined) {
      return rejected;
    }
    const folderNames = readFolderNames(data);
    const items = readArray(data, "items");
    const drafts: ImportedEntryDraft[] = [];
    const notImported: NotImportedItem[] = [];
    for (const [index, item] of items.entries()) {
      if (isJsonRecord(item)) {
        drafts.push(mapBitwardenItem(item, folderNames));
      } else {
        notImported.push({
          scope: "row",
          name: String(index + 1),
          reason: "row-malformed",
        });
      }
      await observer.advance(index + 1, items.length);
    }
    return importSucceeded({ drafts, notImported });
  },
};
