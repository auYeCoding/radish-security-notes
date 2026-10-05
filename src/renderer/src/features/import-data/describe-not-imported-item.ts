import type { TFunction } from "i18next";

import type { NotImportedItem } from "@shared/import/import-reasons";

/**
 * 给用户看的一项未能带入内容的说明.
 */
export interface DescribedNotImportedItem {
  /**
   * 标题: 对象的类别与名称.
   */
  readonly heading: string;
  /**
   * 说明: 字段名称 (有的话) 与原因.
   */
  readonly detail: string;
}

/**
 * 把清单里的一项翻译成给用户看的说明.
 * @param item 清单项.
 * @param translate 翻译函数.
 * @returns 标题与说明.
 */
export function describeNotImportedItem(
  item: NotImportedItem,
  translate: TFunction,
): DescribedNotImportedItem {
  const scope = translate(`import.report.scope.${item.scope}`);
  const reason = translate(`import.reasons.${item.reason}`);
  const heading = `${scope} ${item.name}`;
  if (item.fieldName === undefined) {
    return { heading, detail: reason };
  }
  const field = translate("import.result.notImported.field", {
    field: item.fieldName,
  });
  return { heading, detail: `${field}: ${reason}` };
}
