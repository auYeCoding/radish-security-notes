import type { PresetEntryTypeDefinition } from "@shared/entries/preset-entry-types";

import { TypeFieldInput } from "./type-field-input";

/**
 * 类型字段区的属性.
 */
interface TypeFieldsEditorProps {
  /**
   * 要输入字段的条目类型.
   */
  readonly type: PresetEntryTypeDefinition;
}

/**
 * 条目表单里按类型定义排列的字段区, 新建与编辑共用: 按类型的字段顺序逐项给出输入. 必须在
 * `FormProvider` 里使用.
 * @param props 组件属性.
 * @returns 字段区元素.
 */
export function TypeFieldsEditor(
  props: TypeFieldsEditorProps,
): React.JSX.Element {
  return (
    <>
      {props.type.fields.map((field) => (
        <TypeFieldInput key={field.key} field={field} />
      ))}
    </>
  );
}
