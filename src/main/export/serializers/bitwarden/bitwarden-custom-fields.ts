import type { EntryFieldDefinition } from "@shared/entries/entry-field-types";

import type { ExportEntry } from "../../dataset/export-dataset";
import type { BitwardenMappingInput } from "./bitwarden-mapping";
import { BITWARDEN_FIELD_TYPE, type BitwardenField } from "./bitwarden-types";

/**
 * 构造一个 Bitwarden 自定义字段.
 * @param name 字段名.
 * @param value 字段值.
 * @param isHidden 是否隐藏.
 * @returns 自定义字段.
 */
export function bitwardenFieldOf(
  name: string,
  value: string,
  isHidden: boolean,
): BitwardenField {
  return {
    name,
    value,
    type: isHidden ? BITWARDEN_FIELD_TYPE.hidden : BITWARDEN_FIELD_TYPE.text,
    linkedId: null,
  };
}

/**
 * 把一个类型字段写成自定义字段, 字段名取自定义类型自己的名称, 预设类型取当前界面语言的名称.
 * @param definition 字段定义.
 * @param value 字段值.
 * @param labelOfField 取预设字段名称的函数.
 * @returns 自定义字段.
 */
function typeFieldOf(
  definition: EntryFieldDefinition,
  value: string,
  labelOfField: (fieldKey: string) => string,
): BitwardenField {
  return bitwardenFieldOf(
    definition.name ?? labelOfField(definition.key),
    value,
    definition.isSensitive,
  );
}

/**
 * 把条目里没被类型专属部分用掉的非空类型字段写成自定义字段, 按类型里的字段顺序. 类型不在目录里时
 * 无法判断保密, 字段名取字段键, 一律写成隐藏字段.
 * @param input 映射输入.
 * @param consumedKeys 已被类型专属部分用掉的字段键.
 * @returns 自定义字段.
 */
export function typeFieldsOf(
  input: BitwardenMappingInput,
  consumedKeys: ReadonlySet<string>,
): BitwardenField[] {
  const { entry, definition, labelOfField } = input;
  if (definition === undefined) {
    return Object.entries(entry.fields)
      .filter(([key, value]) => !consumedKeys.has(key) && value !== "")
      .map(([key, value]) => bitwardenFieldOf(key, value, true));
  }
  return definition.fields
    .filter(
      (field) =>
        !consumedKeys.has(field.key) && (entry.fields[field.key] ?? "") !== "",
    )
    .map((field) =>
      typeFieldOf(field, entry.fields[field.key] ?? "", labelOfField),
    );
}

/**
 * 把条目自己的自定义字段写成 Bitwarden 自定义字段, 隐藏的写成隐藏类型.
 * @param entry 条目.
 * @returns 自定义字段, 按填写顺序.
 */
export function entryCustomFieldsOf(entry: ExportEntry): BitwardenField[] {
  return entry.customFields.map((field) =>
    bitwardenFieldOf(field.label, field.value, field.isHidden),
  );
}
