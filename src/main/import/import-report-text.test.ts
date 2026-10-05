import { describe, expect, it } from "vitest";

import type { NotImportedItem } from "@shared/import/import-reasons";

import { buildReportText, type ImportTranslate } from "./import-report-text";

/**
 * 返回键与占位值的假文案函数.
 * @param key 文案键.
 * @param values 占位值.
 * @returns 键与占位值拼成的文本.
 */
const translate: ImportTranslate = (key, values) =>
  values === undefined ? key : `${key}${JSON.stringify(values)}`;

/**
 * 样例清单: 一个条目的字段, 一个整条不支持的条目, 一个文件夹, 一行没解析.
 */
const ITEMS: readonly NotImportedItem[] = [
  { scope: "entry", name: "甲", fieldName: "TOTP", reason: "totp-invalid" },
  { scope: "entry", name: "乙", reason: "type-unsupported" },
  { scope: "folder", name: "工作/项目", reason: "folder-name-truncated" },
  { scope: "row", name: "7", reason: "row-malformed" },
];

describe("未能带入清单的文本", () => {
  it("一行标题, 一行总数, 空行, 然后每项一行, 以换行结尾", () => {
    const lines = buildReportText(ITEMS, translate).split("\n");
    expect(lines.slice(0, 3)).toEqual([
      "import.report.title",
      'import.report.total{"count":4}',
      "",
    ]);
    expect(lines).toHaveLength(8);
    expect(lines[7]).toBe("");
  });

  it("每项带类别, 名称, 字段名 (有的话) 与原因", () => {
    const text = buildReportText(ITEMS, translate);
    expect(text).toContain(
      'import.report.line{"scope":"import.report.scope.entry","name":"甲","field":"import.report.field{\\"field\\":\\"TOTP\\"}","reason":"import.reasons.totp-invalid"}',
    );
    expect(text).toContain(
      '"name":"乙","field":"","reason":"import.reasons.type-unsupported"',
    );
  });

  it("没有清单项时只有标题与总数", () => {
    expect(buildReportText([], translate)).toBe(
      'import.report.title\nimport.report.total{"count":0}\n\n',
    );
  });
});
