import type { EntryCustomField } from "@shared/entries/custom-field-types";
import type { CustomEntryType } from "@shared/entries/custom-types/custom-entry-type-types";
import type { EntryTypeCatalog } from "@shared/entries/custom-types/entry-type-catalog";
import type { EntryFieldValues } from "@shared/entries/entry-types";
import type { NotesFormat } from "@shared/entries/notes-format";
import type { TotpConfig } from "@shared/entries/totp-config";
import type { TagColorKey } from "@shared/tags/tag-colors";

/**
 * 数据集里的一个文件夹.
 */
export interface ExportFolder {
  /**
   * 文件夹编号.
   */
  readonly id: string;
  /**
   * 文件夹名称.
   */
  readonly name: string;
}

/**
 * 数据集里的一个标签.
 */
export interface ExportTag {
  /**
   * 标签编号.
   */
  readonly id: string;
  /**
   * 标签名称.
   */
  readonly name: string;
  /**
   * 标签颜色键.
   */
  readonly color: TagColorKey;
}

/**
 * 数据集里一个附件的元数据, 内容在写入时才按编号读取.
 */
export interface ExportAttachment {
  /**
   * 附件编号.
   */
  readonly id: string;
  /**
   * 附件名称.
   */
  readonly name: string;
  /**
   * 附件的字节数.
   */
  readonly size: number;
  /**
   * 附件在条目上的添加顺序.
   */
  readonly position: number;
}

/**
 * 数据集里的一个条目, 内容与库里一致, 类型字段取值保持库里存的样子.
 */
export interface ExportEntry {
  /**
   * 条目编号.
   */
  readonly id: string;
  /**
   * 条目的类型键, 是预设类型键或自定义类型键.
   */
  readonly typeKey: string;
  /**
   * 条目名称.
   */
  readonly name: string;
  /**
   * 类型字段取值.
   */
  readonly fields: EntryFieldValues;
  /**
   * 备注原文.
   */
  readonly notes: string;
  /**
   * 备注的格式.
   */
  readonly notesFormat: NotesFormat;
  /**
   * 自定义字段, 按填写顺序排列.
   */
  readonly customFields: readonly EntryCustomField[];
  /**
   * TOTP 配置, 条目不带 TOTP 或导出不含保密字段时没有这一项.
   */
  readonly totp: TotpConfig | undefined;
  /**
   * 所属文件夹的编号, 未分类时没有这一项.
   */
  readonly folderId: string | undefined;
  /**
   * 条目带的标签编号, 按选择顺序排列.
   */
  readonly tagIds: readonly string[];
  /**
   * 创建时间的毫秒时间戳.
   */
  readonly createdAt: number;
  /**
   * 条目的附件元数据, 按添加顺序排列.
   */
  readonly attachments: readonly ExportAttachment[];
}

/**
 * 序列化器共用的中立数据集: 从库里一次读出的一个范围内的全部文本数据.
 */
export interface ExportDataset {
  /**
   * 范围是否是全部条目, 是的话文件夹, 标签与自定义类型也全部带上, 否则只带条目用到的.
   */
  readonly isFullScope: boolean;
  /**
   * 数据集是否含保密字段与 TOTP 密钥.
   */
  readonly includesSecrets: boolean;
  /**
   * 是否要把附件内容写进文件.
   */
  readonly includesAttachments: boolean;
  /**
   * 文件夹, 先创建的在前.
   */
  readonly folders: readonly ExportFolder[];
  /**
   * 标签, 先创建的在前.
   */
  readonly tags: readonly ExportTag[];
  /**
   * 自定义类型, 先创建的在前.
   */
  readonly customEntryTypes: readonly CustomEntryType[];
  /**
   * 条目, 按创建先后升序.
   */
  readonly entries: readonly ExportEntry[];
  /**
   * 读取那一刻的类型目录, 序列化器据此查字段的名称与是否保密.
   */
  readonly catalog: EntryTypeCatalog;
}
