import type { EntryTypeCatalog } from "@shared/entries/custom-types/entry-type-catalog";
import type { EntryFieldValues } from "@shared/entries/entry-types";

import type { ExportEntry } from "./export-dataset";

/**
 * 保密字段在不含保密字段的导出里的取值: 键保留, 值为空串.
 */
const REDACTED_VALUE = "";

/**
 * 把类型字段取值里的保密字段值置空. 条目的类型不在目录里时无法判断哪些字段保密, 全部置空.
 * @param fields 条目的类型字段取值.
 * @param typeKey 条目的类型键.
 * @param catalog 类型目录.
 * @returns 保密字段值已置空的类型字段取值.
 */
function redactFields(
  fields: EntryFieldValues,
  typeKey: string,
  catalog: EntryTypeCatalog,
): EntryFieldValues {
  const type = catalog.find(typeKey);
  const sensitiveKeys = new Set(
    type?.fields.filter((field) => field.isSensitive).map((field) => field.key),
  );
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      type === undefined || sensitiveKeys.has(key) ? REDACTED_VALUE : value,
    ]),
  );
}

/**
 * 去掉一个条目里的保密内容: 保密类型字段与隐藏自定义字段的值置空, TOTP 去掉.
 * @param entry 条目.
 * @param catalog 类型目录.
 * @returns 去掉保密内容后的条目.
 */
export function redactEntry(
  entry: ExportEntry,
  catalog: EntryTypeCatalog,
): ExportEntry {
  return {
    ...entry,
    fields: redactFields(entry.fields, entry.typeKey, catalog),
    customFields: entry.customFields.map((field) =>
      field.isHidden ? { ...field, value: REDACTED_VALUE } : field,
    ),
    totp: undefined,
  };
}
