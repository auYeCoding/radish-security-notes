import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { DEFAULT_TAG_COLOR } from "@shared/tags/tag-colors";
import {
  TAG_NAME_MAX_LENGTH,
  type TagFormValues,
} from "@shared/tags/tag-name-schema";

import { TagDialog } from "@renderer/components/tag-dialog";
import { useTagSubmit } from "@renderer/components/use-tag-submit";
import { useTagStore } from "@renderer/stores/use-tag-store";

/**
 * 新建标签表单的初始取值: 空名称与默认颜色.
 */
const NEW_TAG_VALUES: TagFormValues = { name: "", color: DEFAULT_TAG_COLOR };

/**
 * 新建标签对话框的属性.
 */
interface NewTagDialogProps {
  /**
   * 对话框要关闭时的回调, 取消或新建成功之后调用.
   */
  readonly onClose: () => void;
}

/**
 * 新建标签的对话框, 挂载即打开, 关闭即卸载: 填写名称并选颜色后经标签 store 新建, 成功后关闭;
 * 重名等失败原因显示在名称输入框下方.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function NewTagDialog(props: NewTagDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const create = useTagStore((state) => state.create);
  const createTag = useCallback(
    (values: TagFormValues) => create(values.name, values.color),
    [create],
  );
  const { failureMessage, submit } = useTagSubmit(createTag, props.onClose);
  return (
    <TagDialog
      title={t("tagCreate.title")}
      description={t("tagCreate.description", {
        maxLength: TAG_NAME_MAX_LENGTH,
      })}
      submitLabel={t("tagCreate.submit")}
      submittingLabel={t("tagCreate.submitting")}
      initialValues={NEW_TAG_VALUES}
      failureMessage={failureMessage}
      onSubmit={submit}
      onClose={props.onClose}
    />
  );
}
