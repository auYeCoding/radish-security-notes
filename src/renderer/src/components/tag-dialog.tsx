import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  createTagFormSchema,
  type TagFormValues,
} from "@shared/tags/tag-name-schema";

import { NameDialogShell } from "@renderer/components/name-dialog-shell";
import { describeTagNameError } from "@renderer/components/tag-name-errors";
import { TagColorPicker } from "@renderer/components/tag-color-picker";
import { TextField } from "@renderer/components/text-field";
import { Field, FieldLabel } from "@renderer/components/ui/field";

/**
 * 标签对话框的属性.
 */
interface TagDialogProps {
  /**
   * 对话框标题.
   */
  readonly title: string;
  /**
   * 标题下的说明.
   */
  readonly description: string;
  /**
   * 提交按钮的文字.
   */
  readonly submitLabel: string;
  /**
   * 提交执行中提交按钮的文字.
   */
  readonly submittingLabel: string;
  /**
   * 表单的初始取值, 新建时是空名称与默认颜色, 编辑时是标签现在的名称与颜色.
   */
  readonly initialValues: TagFormValues;
  /**
   * 最近一次提交失败的文案 (例如重名), 没有失败时为 undefined, 显示在名称输入框下方.
   */
  readonly failureMessage: string | undefined;
  /**
   * 用校验后的取值提交, 成功时由调用方负责关闭对话框.
   */
  readonly onSubmit: (values: TagFormValues) => Promise<void>;
  /**
   * 对话框要关闭时的回调, 取消, 按 Esc, 点遮罩或点关闭按钮之后调用.
   */
  readonly onClose: () => void;
}

/**
 * 新建与编辑标签共用的对话框, 挂载即打开, 关闭即卸载: 一个名称输入框, 一个调色板与取消, 提交
 * 按钮, 提交进行中不响应关闭. 名称为空或超长时错误显示在输入框下方.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function TagDialog(props: TagDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const colorLabelIdentifier = useId();
  const schema = useMemo(() => createTagFormSchema(), []);
  const form = useForm<TagFormValues>({
    resolver: zodResolver(schema),
    defaultValues: props.initialValues,
  });
  const validationError = describeTagNameError(
    form.formState.errors.name?.message,
    t,
  );
  return (
    <NameDialogShell
      title={props.title}
      description={props.description}
      cancelLabel={t("tagName.cancel")}
      submitLabel={props.submitLabel}
      submittingLabel={props.submittingLabel}
      isSubmitting={form.formState.isSubmitting}
      onSubmit={(event) => void form.handleSubmit(props.onSubmit)(event)}
      onClose={props.onClose}
    >
      <TextField
        {...form.register("name")}
        label={t("tagName.label")}
        autoComplete="off"
        error={validationError ?? props.failureMessage}
      />
      <Controller
        control={form.control}
        name="color"
        render={({ field }) => (
          <Field>
            <FieldLabel id={colorLabelIdentifier}>
              {t("tagName.colorLabel")}
            </FieldLabel>
            <TagColorPicker
              value={field.value}
              onChange={field.onChange}
              labelledBy={colorLabelIdentifier}
            />
          </Field>
        )}
      />
    </NameDialogShell>
  );
}
