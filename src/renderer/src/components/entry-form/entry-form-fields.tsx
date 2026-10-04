import type { ReactNode } from "react";

import type { PresetEntryTypeDefinition } from "@shared/entries/preset-entry-types";

import { FieldGroup } from "@renderer/components/ui/field";

import { CustomFieldsEditor } from "./custom-fields-editor";
import { EntryNameField } from "./entry-name-field";
import { NotesField } from "./notes-field";
import { TypeFieldsEditor } from "./type-fields-editor";

/**
 * 条目表单字段区的属性.
 */
interface EntryFormFieldsProps {
  /**
   * 条目类型, 字段区显示该类型的字段.
   */
  readonly type: PresetEntryTypeDefinition;
  /**
   * 名称之后的所属文件夹选择, 新建与编辑各自给出.
   */
  readonly folderField: ReactNode;
  /**
   * 所属文件夹之后的标签选择, 新建与编辑各自给出.
   */
  readonly tagField: ReactNode;
  /**
   * 字段区末尾的 TOTP 区, 新建与编辑各自给出.
   */
  readonly totpField: ReactNode;
}

/**
 * 条目表单的字段区, 新建与编辑共用: 依次是名称, 调用方给出的所属文件夹与标签选择, 该类型的字段,
 * 自定义字段, 备注与调用方给出的 TOTP 区. 超过限定高度时在区域内滚动. 必须在 `FormProvider` 里使用.
 * @param props 组件属性.
 * @returns 字段区元素.
 */
export function EntryFormFields(
  props: EntryFormFieldsProps,
): React.JSX.Element {
  return (
    <div className="-m-1 max-h-96 overflow-y-auto p-1">
      <FieldGroup>
        <EntryNameField />
        {props.folderField}
        {props.tagField}
        <TypeFieldsEditor type={props.type} />
        <CustomFieldsEditor />
        <NotesField />
        {props.totpField}
      </FieldGroup>
    </div>
  );
}
