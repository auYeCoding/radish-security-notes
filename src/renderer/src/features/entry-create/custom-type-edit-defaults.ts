import type { CustomEntryTypeFormValues } from "@shared/entries/custom-types/custom-entry-type-schema";
import { CUSTOM_SUMMARY_FIELD_KEY } from "@shared/entries/custom-types/custom-entry-type-key";
import type { CustomEntryType } from "@shared/entries/custom-types/custom-entry-type-types";

/**
 * 编辑类型表单的初始取值: 取自已保存的类型, 每个字段带着它的字段键, 键为摘要键的字段是列表摘要
 * 字段.
 * @param type 已保存的自定义类型.
 * @returns 表单初始取值.
 */
export function createEditCustomTypeValues(
  type: CustomEntryType,
): CustomEntryTypeFormValues {
  return {
    name: type.name,
    fields: type.fields.map((field) => ({
      key: field.key,
      name: field.name,
      kind: field.kind,
      isSensitive: field.isSensitive,
      isSummary: field.key === CUSTOM_SUMMARY_FIELD_KEY,
    })),
  };
}
