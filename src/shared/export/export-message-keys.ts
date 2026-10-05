import type { EntryFieldKey } from "../entries/preset-entry-types";
import type { ExportFormatKey } from "./export-format-keys";

/**
 * 主进程取当前语言文案时用到的键: 保存对话框的标题与类型过滤器名称. 键对应的文案写在
 * `shared/locales` 里, 键类型在编译期与 `zh.json` 对照.
 */
export type ExportMessageKey =
  | "export.dialog.saveTitle"
  | "export.dialog.filter.encrypted"
  | `export.dialog.filter.${ExportFormatKey}`;

/**
 * 导出服务取文案用到的全部键: 保存对话框的文案, 以及预设类型字段的名称 (第三方格式把预设字段
 * 写成自定义字段时用).
 */
export type ExportTranslateKey =
  ExportMessageKey | `entryFields.${EntryFieldKey}`;
