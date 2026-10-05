import type { ImportMessageKey } from "@shared/import/import-message-keys";
import type { NotImportedItem } from "@shared/import/import-reasons";

/**
 * 按键取当前语言文案的函数, 参数里的占位值按名称替换.
 */
export type ImportTranslate = (
  key: ImportMessageKey,
  values?: Readonly<Record<string, string | number>>,
) => string;

/**
 * 行与行之间的分隔符.
 */
const LINE_BREAK = "\n";

/**
 * 把清单里的一项写成一行: 类别, 名称, 字段名称 (有的话), 原因.
 * @param item 清单项.
 * @param translate 取文案的函数.
 * @returns 一行文本.
 */
function formatItem(item: NotImportedItem, translate: ImportTranslate): string {
  const scope = translate(`import.report.scope.${item.scope}`);
  const reason = translate(`import.reasons.${item.reason}`);
  const field =
    item.fieldName === undefined
      ? ""
      : translate("import.report.field", { field: item.fieldName });
  return translate("import.report.line", {
    scope,
    name: item.name,
    field,
    reason,
  });
}

/**
 * 把未能带入清单写成纯文本, 用于保存为文本文件: 一行标题, 一行总数, 然后每项一行. 文本只含名称,
 * 字段名称与原因, 不含任何字段的值.
 * @param items 清单项.
 * @param translate 取当前语言文案的函数.
 * @returns 文件文本, 以换行结尾.
 */
export function buildReportText(
  items: readonly NotImportedItem[],
  translate: ImportTranslate,
): string {
  const lines = [
    translate("import.report.title"),
    translate("import.report.total", { count: items.length }),
    "",
    ...items.map((item) => formatItem(item, translate)),
  ];
  return `${lines.join(LINE_BREAK)}${LINE_BREAK}`;
}
