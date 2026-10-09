import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  createCustomEntryTypeSchema,
  type CustomEntryTypeFormValues,
} from "@shared/entries/custom-types/custom-entry-type-schema";

import { EntryFormActions } from "@renderer/components/entry-form/entry-form-actions";
import { DialogScrollBody } from "@renderer/components/scrollable-dialog";
import { TextField } from "@renderer/components/text-field";
import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import { FieldGroup } from "@renderer/components/ui/field";

import { CustomTypeBackBar } from "./custom-type-back-bar";
import { describeCustomTypeError } from "./custom-type-errors";
import { CustomTypeFieldsEditor } from "./custom-type-fields-editor";

/**
 * 类型表单外壳的属性.
 */
interface CustomTypeFormViewProps {
  /**
   * 表单的初始取值, 只在表单首次渲染时使用.
   */
  readonly defaultValues: CustomEntryTypeFormValues;
  /**
   * 最近一次保存失败的文案, 没有失败时为 undefined.
   */
  readonly failureMessage: string | undefined;
  /**
   * 保存按钮的文字.
   */
  readonly submitLabel: string;
  /**
   * 保存执行中保存按钮的文字.
   */
  readonly submittingLabel: string;
  /**
   * 表单校验通过后的提交回调.
   */
  readonly onSubmit: (values: CustomEntryTypeFormValues) => Promise<void>;
  /**
   * 点击返回按钮时的回调, 回到类型选择.
   */
  readonly onBack: () => void;
}

/**
 * 新建与编辑自定义条目类型共用的表单外壳: 顶部是返回按钮, 之后依次是类型名称与字段区, 最后是
 * 取消, 保存按钮. 字段区超过对话框能给的高度时在区域内滚动 (标题, 返回按钮与底部按钮行固定), 保存失败的原因显示在字段区上方的提示条里,
 * 校验错误显示在对应输入下方. 初始取值, 提交行为与保存按钮文字由调用方给出.
 * @param props 组件属性.
 * @returns 表单元素.
 */
export function CustomTypeFormView(
  props: CustomTypeFormViewProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const schema = useMemo(() => createCustomEntryTypeSchema(), []);
  const form = useForm<CustomEntryTypeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: props.defaultValues,
  });
  const { isSubmitting, errors } = form.formState;
  return (
    <FormProvider {...form}>
      <form
        noValidate
        className="flex min-h-0 flex-col gap-5"
        onSubmit={(event) => void form.handleSubmit(props.onSubmit)(event)}
      >
        <CustomTypeBackBar onBack={props.onBack} isDisabled={isSubmitting} />
        {props.failureMessage !== undefined && (
          <Alert variant="destructive">
            <AlertDescription>{props.failureMessage}</AlertDescription>
          </Alert>
        )}
        <DialogScrollBody>
          <FieldGroup>
            <TextField
              {...form.register("name")}
              label={t("entryCreate.customType.nameLabel")}
              autoComplete="off"
              error={describeCustomTypeError(errors.name?.message, t)}
            />
            <CustomTypeFieldsEditor />
          </FieldGroup>
        </DialogScrollBody>
        <EntryFormActions
          cancelLabel={t("entryCreate.customType.cancel")}
          submitLabel={props.submitLabel}
          submittingLabel={props.submittingLabel}
          isSubmitting={isSubmitting}
        />
      </form>
    </FormProvider>
  );
}
