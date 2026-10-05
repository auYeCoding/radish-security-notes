import type { EntryCustomField } from "@shared/entries/custom-field-types";
import type { CustomEntryTypeField } from "@shared/entries/custom-types/custom-entry-type-types";
import type { EntryFieldValues } from "@shared/entries/entry-types";
import type { NotesFormat } from "@shared/entries/notes-format";
import type { TotpConfig } from "@shared/entries/totp-config";
import type { TagColorKey } from "@shared/tags/tag-colors";

import type {
  NATIVE_FORMAT_ID,
  NATIVE_FORMAT_VERSION,
} from "./native-format-version";

/**
 * `manifest.json` 里的各项计数.
 */
export interface NativeManifestCounts {
  /**
   * 条目个数.
   */
  readonly entries: number;
  /**
   * 文件夹个数.
   */
  readonly folders: number;
  /**
   * 标签个数.
   */
  readonly tags: number;
  /**
   * 自定义类型个数.
   */
  readonly customEntryTypes: number;
  /**
   * 文件里附件内容的个数, 不含附件时为 0.
   */
  readonly attachments: number;
}

/**
 * `manifest.json` 的内容.
 */
export interface NativeManifest {
  /**
   * 格式标识.
   */
  readonly format: typeof NATIVE_FORMAT_ID;
  /**
   * 格式版本号.
   */
  readonly version: typeof NATIVE_FORMAT_VERSION;
  /**
   * 导出开始的时间, ISO 8601 文本.
   */
  readonly createdAt: string;
  /**
   * 范围: 全部条目, 或指定的条目.
   */
  readonly scope: "all" | "selection";
  /**
   * 文件是否含保密字段与 TOTP 密钥, 不含时保密字段值为空串, TOTP 为 null.
   */
  readonly includesSecrets: boolean;
  /**
   * 文件是否含附件内容, 不含时每个条目的附件列表为空.
   */
  readonly includesAttachments: boolean;
  /**
   * 各项计数.
   */
  readonly counts: NativeManifestCounts;
}

/**
 * `vault.json` 里的文件夹.
 */
export interface NativeFolderDocument {
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
 * `vault.json` 里的标签.
 */
export interface NativeTagDocument {
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
 * `vault.json` 里的自定义类型.
 */
export interface NativeCustomTypeDocument {
  /**
   * 类型编号.
   */
  readonly id: string;
  /**
   * 类型键, 条目的 `type` 引用它.
   */
  readonly key: string;
  /**
   * 类型名称.
   */
  readonly name: string;
  /**
   * 类型的字段, 按显示顺序排列.
   */
  readonly fields: readonly CustomEntryTypeField[];
}

/**
 * `vault.json` 里条目的一个附件, 内容在压缩包里 `path` 指向的文件.
 */
export interface NativeAttachmentDocument {
  /**
   * 附件编号.
   */
  readonly id: string;
  /**
   * 附件原名称.
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
  /**
   * 附件内容在压缩包里的路径.
   */
  readonly path: string;
}

/**
 * `vault.json` 里的条目.
 */
export interface NativeEntryDocument {
  /**
   * 条目编号.
   */
  readonly id: string;
  /**
   * 条目的类型键, 是预设类型键或自定义类型键.
   */
  readonly type: string;
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
   * TOTP 配置, 条目不带 TOTP 或文件不含保密字段时为 null.
   */
  readonly totp: TotpConfig | null;
  /**
   * 所属文件夹的编号, 未分类时为 null.
   */
  readonly folderId: string | null;
  /**
   * 条目带的标签编号, 按选择顺序排列.
   */
  readonly tagIds: readonly string[];
  /**
   * 创建时间的毫秒时间戳.
   */
  readonly createdAt: number;
  /**
   * 条目的附件, 按添加顺序排列, 文件不含附件时为空数组.
   */
  readonly attachments: readonly NativeAttachmentDocument[];
}
