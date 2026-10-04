import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { EditEntryFormValues } from "@shared/entries/edit-entry-schema";
import type { EntryTypeDefinition } from "@shared/entries/entry-field-types";
import type { EntryDetail } from "@shared/entries/entry-types";

import { EntryFormActions } from "@renderer/components/entry-form/entry-form-actions";
import { EntryFormFields } from "@renderer/components/entry-form/entry-form-fields";
import { FolderSelectField } from "@renderer/components/entry-form/folder-select-field";
import { TagSelectField } from "@renderer/components/entry-form/tag-select-field";
import { EntryTypeLabel } from "@renderer/components/entry-type-label";
import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import { useSortedFolders } from "@renderer/stores/use-sorted-folders";
import { useSortedTags } from "@renderer/stores/use-sorted-tags";

import { EditTotpField } from "./edit-totp-field";
import { useEditEntry } from "./use-edit-entry";

/**
 * 编辑表单的属性.
 */
interface EditEntryFormProps {
  /**
   * 要编辑的条目详情, 表单的初始取值与类型都来自它.
   */
  readonly detail: EntryDetail;
  /**
   * 条目的类型定义 (预设或自定义), 表单显示它的字段.
   */
  readonly type: EntryTypeDefinition;
  /**
   * 保存成功后的回调, 例如关闭对话框.
   */
  readonly onSaved: () => void;
}

/**
 * 编辑条目的表单: 顶部标明条目类型 (不能更换), 之后依次是名称, 所属文件夹, 标签, 该类型的字段, 自定义
 * 字段, 备注与 TOTP, 最后是取消, 保存按钮. 保存失败的原因显示在字段区域上方的提示条里, 校验错误显示在对应
 * 字段下方. 必须在 `FormProvider` 里使用, 表单的初始取值与校验方案由外层的对话框给出.
 * @param props 组件属性.
 * @returns 表单元素.
 */
export function EditEntryForm(props: EditEntryFormProps): React.JSX.Element {
  const { t } = useTranslation();
  const { detail, type } = props;
  const { failureMessage, submit } = useEditEntry(detail.id, props.onSaved);
  const form = useFormContext<EditEntryFormValues>();
  const folders = useSortedFolders();
  const tags = useSortedTags();
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
    >
      <EntryTypeLabel type={type} />
      {failureMessage !== undefined && (
        <Alert variant="destructive">
          <AlertDescription>{failureMessage}</AlertDescription>
        </Alert>
      )}
      <EntryFormFields
        type={type}
        folderField={<FolderSelectField folders={folders} />}
        tagField={<TagSelectField tags={tags} />}
        totpField={<EditTotpField hasTotp={detail.hasTotp} />}
      />
      <EntryFormActions
        cancelLabel={t("entryEdit.cancel")}
        submitLabel={t("entryEdit.submit")}
        submittingLabel={t("entryEdit.submitting")}
        isSubmitting={form.formState.isSubmitting}
      />
    </form>
  );
}
