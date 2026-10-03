import type { ReactNode } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { NewEntryFormValues } from "@shared/entries/new-entry-schema";
import type { PresetEntryTypeDefinition } from "@shared/entries/preset-entry-types";

import { TextareaField } from "@renderer/components/textarea-field";
import { FieldGroup } from "@renderer/components/ui/field";

import { CustomFieldsEditor } from "./custom-fields-editor";
import { EntryNameField } from "./entry-name-field";
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
   * 字段区末尾的 TOTP 区, 新建与编辑各自给出.
   */
  readonly totpField: ReactNode;
}

/**
 * 条目表单的字段区, 新建与编辑共用: 依次是名称, 该类型的字段, 自定义字段, 备注与调用方给出的
 * TOTP 区. 超过限定高度时在区域内滚动. 必须在 `FormProvider` 里使用.
 * @param props 组件属性.
 * @returns 字段区元素.
 */
export function EntryFormFields(
  props: EntryFormFieldsProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { register } = useFormContext<NewEntryFormValues>();
  return (
    <div className="-m-1 max-h-96 overflow-y-auto p-1">
      <FieldGroup>
        <EntryNameField />
        <TypeFieldsEditor type={props.type} />
        <CustomFieldsEditor />
        <TextareaField
          {...register("notes")}
          label={t("entryForm.notesLabel")}
          autoComplete="off"
        />
        {props.totpField}
      </FieldGroup>
    </div>
  );
}
