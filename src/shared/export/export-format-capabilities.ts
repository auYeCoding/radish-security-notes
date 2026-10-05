import type { ExportFormatKey } from "./export-format-keys";
import type { ExportLossReason } from "./export-loss-reasons";

/**
 * 口令加密后的文件追加的扩展名, 不含点号. 是 age 命令行认得的扩展名.
 */
export const ENCRYPTED_FILE_EXTENSION = "age";

/**
 * 一种导出格式的能力描述.
 */
export interface ExportFormatCapability {
  /**
   * 格式的键.
   */
  readonly key: ExportFormatKey;
  /**
   * 未加密时的文件扩展名, 不含点号.
   */
  readonly fileExtension: string;
  /**
   * 格式是否能带附件, 不能带的格式里附件开关不可用.
   */
  readonly canCarryAttachments: boolean;
  /**
   * 格式带不出的内容的原因, 界面在选格式时据此提示, 主进程据此汇总实际带不出的条数.
   */
  readonly excludedContent: readonly ExportLossReason[];
}

/**
 * 全部导出格式的能力, 每种格式一行. 新增格式时在这里加一行.
 */
const EXPORT_FORMAT_CAPABILITIES: readonly ExportFormatCapability[] = [
  {
    key: "native",
    fileExtension: "zip",
    canCarryAttachments: true,
    excludedContent: [],
  },
  {
    key: "bitwardenJson",
    fileExtension: "json",
    canCarryAttachments: false,
    excludedContent: [
      "tags",
      "attachments",
      "customEntryTypes",
      "mergedTypes",
      "downgradedSshKeys",
      "markdownNotes",
    ],
  },
  {
    key: "browserCsv",
    fileExtension: "csv",
    canCarryAttachments: false,
    excludedContent: [
      "unsupportedEntries",
      "totp",
      "customFields",
      "extraFields",
      "folders",
      "tags",
      "attachments",
      "markdownNotes",
    ],
  },
];

/**
 * 按格式的键取它的能力描述.
 * @param key 格式的键.
 * @returns 格式的能力描述.
 * @throws Error 当格式没有登记能力时.
 */
export function describeExportFormat(
  key: ExportFormatKey,
): ExportFormatCapability {
  const capability = EXPORT_FORMAT_CAPABILITIES.find(
    (candidate) => candidate.key === key,
  );
  if (capability === undefined) {
    throw new Error("未登记的导出格式");
  }
  return capability;
}

/**
 * 导出文件的完整扩展名: 格式的扩展名, 口令加密时再追加加密扩展名.
 * @param key 格式的键.
 * @param isEncrypted 是否口令加密.
 * @returns 不含前导点号的扩展名, 如 `zip` 或 `zip.age`.
 */
export function exportFileExtension(
  key: ExportFormatKey,
  isEncrypted: boolean,
): string {
  const { fileExtension } = describeExportFormat(key);
  return isEncrypted
    ? `${fileExtension}.${ENCRYPTED_FILE_EXTENSION}`
    : fileExtension;
}
