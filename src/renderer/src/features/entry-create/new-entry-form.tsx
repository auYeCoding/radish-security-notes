import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  newEntrySchema,
  type NewEntryFormValues,
} from "@shared/entries/new-entry-schema";

import { TextareaField } from "@renderer/components/textarea-field";
import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import { FieldGroup } from "@renderer/components/ui/field";

import { CustomFieldsEditor } from "./custom-fields-editor";
import { NewEntryActions } from "./new-entry-actions";
import { NewEntryMainFields } from "./new-entry-main-fields";
import { useCreateEntry } from "./use-create-entry";

/**
 * 新建表单的属性.
 */
interface NewEntryFormProps {
  /**
   * 新建成功后的回调, 例如关闭对话框.
   */
  readonly onCreated: () => void;
}

/**
 * 新建表单的默认取值: 文本项都为空, 没有自定义字段.
 */
const DEFAULT_VALUES: NewEntryFormValues = {
  name: "",
  account: "",
  password: "",
  url: "",
  notes: "",
  customFields: [],
};

/**
 * 新建条目的表单: 名称, 账号, 密码, 网址, 自定义字段与备注, 以及取消, 保存按钮. 字段区域超过
 * 限定高度时在区域内滚动, 保存失败的原因显示在字段区域上方的提示条里, 校验错误显示在对应
 * 字段下方.
 * @param props 组件属性.
 * @returns 表单元素.
 */
export function NewEntryForm(props: NewEntryFormProps): React.JSX.Element {
  const { t } = useTranslation();
  const { failureMessage, submit } = useCreateEntry(props.onCreated);
  const form = useForm<NewEntryFormValues>({
    resolver: zodResolver(newEntrySchema),
    defaultValues: DEFAULT_VALUES,
  });
  return (
    <FormProvider {...form}>
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(event) => void form.handleSubmit(submit)(event)}
      >
        {failureMessage !== undefined && (
          <Alert variant="destructive">
            <AlertDescription>{failureMessage}</AlertDescription>
          </Alert>
        )}
        <div className="-m-1 max-h-96 overflow-y-auto p-1">
          <FieldGroup>
            <NewEntryMainFields />
            <CustomFieldsEditor />
            <TextareaField
              {...form.register("notes")}
              label={t("entryCreate.notesLabel")}
              autoComplete="off"
            />
          </FieldGroup>
        </div>
        <NewEntryActions isSubmitting={form.formState.isSubmitting} />
      </form>
    </FormProvider>
  );
}
