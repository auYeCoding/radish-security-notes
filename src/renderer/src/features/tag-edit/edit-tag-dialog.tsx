import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import {
  TAG_NAME_MAX_LENGTH,
  type TagFormValues,
} from "@shared/tags/tag-name-schema";
import type { TagSummary } from "@shared/tags/tag-types";

import { TagDialog } from "@renderer/components/tag-dialog";
import { useTagSubmit } from "@renderer/components/use-tag-submit";
import { useTagStore } from "@renderer/stores/use-tag-store";

/**
 * 编辑标签对话框的属性.
 */
interface EditTagDialogProps {
  /**
   * 要编辑的标签, 名称输入框与调色板以它现在的名称与颜色为初始取值.
   */
  readonly tag: TagSummary;
  /**
   * 对话框要关闭时的回调, 取消或保存成功之后调用.
   */
  readonly onClose: () => void;
}

/**
 * 编辑标签的对话框, 挂载即打开, 关闭即卸载: 预填现在的名称与颜色, 保存后经标签 store 编辑,
 * 成功后关闭; 重名等失败原因显示在名称输入框下方.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function EditTagDialog(props: EditTagDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const update = useTagStore((state) => state.update);
  const { id, name, color } = props.tag;
  const updateThisTag = useCallback(
    (values: TagFormValues) => update(id, values.name, values.color),
    [update, id],
  );
  const { failureMessage, submit } = useTagSubmit(updateThisTag, props.onClose);
  return (
    <TagDialog
      title={t("tagEdit.title")}
      description={t("tagEdit.description", {
        maxLength: TAG_NAME_MAX_LENGTH,
      })}
      submitLabel={t("tagEdit.submit")}
      submittingLabel={t("tagEdit.submitting")}
      initialValues={{ name, color }}
      failureMessage={failureMessage}
      onSubmit={submit}
      onClose={props.onClose}
    />
  );
}
