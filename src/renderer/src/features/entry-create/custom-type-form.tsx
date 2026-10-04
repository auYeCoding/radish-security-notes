import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  createCustomEntryTypeSchema,
  type CustomEntryTypeFormValues,
} from "@shared/entries/custom-types/custom-entry-type-schema";
import type { EntryTypeDefinition } from "@shared/entries/entry-field-types";

import { EntryFormActions } from "@renderer/components/entry-form/entry-form-actions";
import { TextField } from "@renderer/components/text-field";
import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import { FieldGroup } from "@renderer/components/ui/field";

import { CustomTypeBackBar } from "./custom-type-back-bar";
import { createDefaultCustomTypeValues } from "./custom-type-defaults";
import { describeCustomTypeError } from "./custom-type-errors";
import { CustomTypeFieldsEditor } from "./custom-type-fields-editor";
import { useCreateCustomType } from "./use-create-custom-type";

/**
 * 新建类型表单的属性.
 */
interface CustomTypeFormProps {
  /**
   * 点击返回按钮时的回调, 回到类型选择.
   */
  readonly onBack: () => void;
  /**
   * 新建成功后的回调, 参数是新类型的定义.
   */
  readonly onCreated: (type: EntryTypeDefinition) => void;
}

/**
 * 新建自定义条目类型的表单: 顶部是返回按钮, 之后依次是类型名称与字段区, 最后是取消, 保存按钮.
 * 字段区超过限定高度时在区域内滚动, 保存失败的原因显示在字段区上方的提示条里, 校验错误显示在
 * 对应输入下方.
 * @param props 组件属性.
 * @returns 表单元素.
 */
export function CustomTypeForm(props: CustomTypeFormProps): React.JSX.Element {
  const { t } = useTranslation();
  const { failureMessage, submit } = useCreateCustomType(props.onCreated);
  const schema = useMemo(() => createCustomEntryTypeSchema(), []);
  const form = useForm<CustomEntryTypeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: createDefaultCustomTypeValues(),
  });
  const { isSubmitting, errors } = form.formState;
  return (
    <FormProvider {...form}>
      <form
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(event) => void form.handleSubmit(submit)(event)}
      >
        <CustomTypeBackBar onBack={props.onBack} isDisabled={isSubmitting} />
        {failureMessage !== undefined && (
          <Alert variant="destructive">
            <AlertDescription>{failureMessage}</AlertDescription>
          </Alert>
        )}
        <div className="-m-1 max-h-96 overflow-y-auto p-1">
          <FieldGroup>
            <TextField
              {...form.register("name")}
              label={t("entryCreate.customType.nameLabel")}
              autoComplete="off"
              error={describeCustomTypeError(errors.name?.message, t)}
            />
            <CustomTypeFieldsEditor />
          </FieldGroup>
        </div>
        <EntryFormActions
          cancelLabel={t("entryCreate.customType.cancel")}
          submitLabel={t("entryCreate.customType.submit")}
          submittingLabel={t("entryCreate.customType.submitting")}
          isSubmitting={isSubmitting}
        />
      </form>
    </FormProvider>
  );
}
