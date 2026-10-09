import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { EntryTypeDefinition } from "@shared/entries/entry-field-types";
import {
  createNewEntrySchema,
  type NewEntryFormValues,
} from "@shared/entries/new-entry-schema";
import { folderIdOfView } from "@shared/folders/folder-view";

import { EntryFormActions } from "@renderer/components/entry-form/entry-form-actions";
import { EntryFormFields } from "@renderer/components/entry-form/entry-form-fields";
import { FolderSelectField } from "@renderer/components/entry-form/folder-select-field";
import { TagSelectField } from "@renderer/components/entry-form/tag-select-field";
import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import { useEntryStore } from "@renderer/stores/use-entry-store";
import { useSortedFolders } from "@renderer/stores/use-sorted-folders";
import { useSortedTags } from "@renderer/stores/use-sorted-tags";

import { createDefaultFormValues } from "./new-entry-defaults";
import { NewEntryTotpField } from "./new-entry-totp-field";
import { NewEntryTypeBar } from "./new-entry-type-bar";
import { useCreateEntry } from "./use-create-entry";

/**
 * 新建表单的属性.
 */
interface NewEntryFormProps {
  /**
   * 用户选的条目类型, 表单显示该类型的字段.
   */
  readonly type: EntryTypeDefinition;
  /**
   * 点击返回按钮时的回调, 回到类型选择.
   */
  readonly onBack: () => void;
  /**
   * 新建成功后的回调, 例如关闭对话框.
   */
  readonly onCreated: () => void;
}

/**
 * 新建条目的表单: 顶部是类型栏, 之后依次是名称, 所属文件夹 (默认是侧栏当前选中的文件夹, 选中
 * 全部条目时是无文件夹), 标签 (默认不带标签), 该类型的字段, 自定义字段, 备注与 TOTP,
 * 最后是取消, 保存按钮. 字段区域超过对话框能给的高度时在区域内滚动 (标题, 类型栏与底部按钮行固定), 保存失败的原因显示在字段区域上方的提示条里,
 * 校验错误显示在对应字段下方.
 * @param props 组件属性.
 * @returns 表单元素.
 */
export function NewEntryForm(props: NewEntryFormProps): React.JSX.Element {
  const { t } = useTranslation();
  const { type } = props;
  const { failureMessage, submit } = useCreateEntry(type.key, props.onCreated);
  const schema = useMemo(() => createNewEntrySchema(type), [type]);
  const folders = useSortedFolders();
  const tags = useSortedTags();
  const defaultFolderId = useEntryStore((state) => folderIdOfView(state.view));
  const form = useForm<NewEntryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: createDefaultFormValues(type, defaultFolderId),
  });
  return (
    <FormProvider {...form}>
      <form
        noValidate
        className="flex min-h-0 flex-col gap-5"
        onSubmit={(event) => void form.handleSubmit(submit)(event)}
      >
        <NewEntryTypeBar
          type={type}
          onBack={props.onBack}
          isDisabled={form.formState.isSubmitting}
        />
        {failureMessage !== undefined && (
          <Alert variant="destructive">
            <AlertDescription>{failureMessage}</AlertDescription>
          </Alert>
        )}
        <EntryFormFields
          type={type}
          folderField={<FolderSelectField folders={folders} />}
          tagField={<TagSelectField tags={tags} />}
          totpField={<NewEntryTotpField />}
        />
        <EntryFormActions
          cancelLabel={t("entryCreate.cancel")}
          submitLabel={t("entryCreate.submit")}
          submittingLabel={t("entryCreate.submitting")}
          isSubmitting={form.formState.isSubmitting}
        />
      </form>
    </FormProvider>
  );
}
