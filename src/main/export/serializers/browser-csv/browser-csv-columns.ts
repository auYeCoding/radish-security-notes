import { stringify } from "csv-stringify/sync";

import { ACCOUNT_FIELD_KEY } from "@shared/entries/common-entry-fields";

import type { ExportEntry } from "../../dataset/export-dataset";

/**
 * 浏览器密码 CSV 的列, 与 Chrome 导出的列一致: 名称, 网址, 用户名, 密码, 备注.
 */
export const BROWSER_CSV_COLUMNS = [
  "name",
  "url",
  "username",
  "password",
  "note",
] as const;

/**
 * 密码字段的键, 类型有这个字段才能写进浏览器密码 CSV.
 */
export const BROWSER_CSV_PASSWORD_KEY = "password";

/**
 * 网址字段的键.
 */
export const BROWSER_CSV_URL_KEY = "url";

/**
 * 含回车或换行的字段要加引号. csv-stringify 默认只在含分隔符, 引号或记录分隔符 (CRLF) 时加引号,
 * 不对只含 CR 或 LF 的字段加引号, 这里补上, 与 Chromium `csv_writer.cc` 的规则一致.
 */
const QUOTE_LINE_BREAKS = /[\r\n]/;

/**
 * 把一行写成 CSV 文本: 含逗号, 引号, CR, LF 的字段加引号且引号双写, 行以 CRLF 结束.
 * @param cells 一行里的各个单元格.
 * @returns 带行结束符的 CSV 文本.
 */
export function formatCsvRow(cells: readonly string[]): string {
  return stringify([[...cells]], {
    record_delimiter: "windows",
    quoted_match: QUOTE_LINE_BREAKS,
  });
}

/**
 * 把条目写成浏览器密码 CSV 的一行: 名称取条目名称, 网址取网址字段, 用户名取账号字段, 密码取密码
 * 字段, 备注取备注原文. 值原样输出, 不做任何转义前缀.
 * @param entry 条目.
 * @returns 一行里的各个单元格, 顺序与 `BROWSER_CSV_COLUMNS` 一致.
 */
export function toBrowserCsvCells(entry: ExportEntry): string[] {
  return [
    entry.name,
    entry.fields[BROWSER_CSV_URL_KEY] ?? "",
    entry.fields[ACCOUNT_FIELD_KEY] ?? "",
    entry.fields[BROWSER_CSV_PASSWORD_KEY] ?? "",
    entry.notes,
  ];
}
