import type {
  EntryCustomField,
  NewCustomFieldInput,
} from "@shared/entries/custom-field-types";

/**
 * 给新建条目的自定义字段依次分配编号, 保持填写顺序.
 * @param inputs 用户填写的自定义字段.
 * @param createIdentifier 生成唯一编号的函数.
 * @returns 带编号的自定义字段.
 */
export function assignCustomFieldIdentifiers(
  inputs: readonly NewCustomFieldInput[],
  createIdentifier: () => string,
): EntryCustomField[] {
  return inputs.map((input) => ({
    id: createIdentifier(),
    label: input.label,
    value: input.value,
    isHidden: input.isHidden,
  }));
}

/**
 * 按编号找一个自定义字段.
 * @param fields 条目的自定义字段.
 * @param id 自定义字段编号.
 * @returns 自定义字段, 没有这个编号时为 undefined.
 */
export function findCustomField(
  fields: readonly EntryCustomField[],
  id: string,
): EntryCustomField | undefined {
  return fields.find((field) => field.id === id);
}
