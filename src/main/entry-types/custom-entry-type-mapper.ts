import { toCustomTypeKey } from "@shared/entries/custom-types/custom-entry-type-key";
import type { CustomEntryType } from "@shared/entries/custom-types/custom-entry-type-types";

import type { CustomEntryTypeRows } from "./custom-entry-type-repository";

/**
 * 把数据库里的一个自定义类型的行转成共享层的自定义类型.
 * @param rows 类型行与字段行.
 * @returns 自定义类型, 类型键由类型编号生成, 字段保持行里的顺序.
 */
export function toCustomEntryType(rows: CustomEntryTypeRows): CustomEntryType {
  const { type, fields } = rows;
  return {
    id: type.id,
    key: toCustomTypeKey(type.id),
    name: type.name,
    fields: fields.map((field) => ({
      key: field.key,
      name: field.name,
      kind: field.kind,
      isSensitive: field.isSensitive,
    })),
  };
}
