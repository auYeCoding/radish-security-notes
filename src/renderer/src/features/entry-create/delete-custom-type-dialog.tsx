import { useTranslation } from "react-i18next";

import { customTypeIdOf } from "@shared/entries/custom-types/custom-entry-type-key";
import type { EntryTypeDefinition } from "@shared/entries/entry-field-types";

import { DestructiveConfirmDialog } from "@renderer/components/destructive-confirm-dialog";
import { useEntryCountOfType } from "@renderer/stores/use-entry-count-of-type";

import { useDeleteCustomType } from "./use-delete-custom-type";

/**
 * 删除类型确认框的属性.
 */
interface DeleteCustomTypeDialogProps {
  /**
   * 要删除的自定义类型.
   */
  readonly type: EntryTypeDefinition;
  /**
   * 确认框要关闭时的回调, 取消或删除成功之后调用.
   */
  readonly onClose: () => void;
}

/**
 * 删除自定义类型的确认框, 挂载即打开, 关闭即卸载: 写明类型名称与无法恢复; 类型下有条目时再写明
 * 条目个数, 条目不会被删除而是改归安全笔记, 字段取值转成条目的自定义字段. 用户点 "删除类型" 才
 * 执行, 点 "取消" 或按 Esc 则什么都不做. 外观与交互由共用的破坏性操作确认框提供.
 * @param props 组件属性.
 * @returns 确认框元素.
 */
export function DeleteCustomTypeDialog(
  props: DeleteCustomTypeDialogProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { type, onClose } = props;
  const entryCount = useEntryCountOfType(type.key);
  const { isDeleting, failureMessage, confirm } = useDeleteCustomType(
    customTypeIdOf(type.key) ?? type.key,
    onClose,
  );
  const name = type.name ?? type.key;
  return (
    <DestructiveConfirmDialog
      title={t("entryCreate.customType.delete.title")}
      description={
        entryCount > 0
          ? t("entryCreate.customType.delete.descriptionWithEntries", {
              name,
              count: entryCount,
              target: t("entryTypes.secureNote"),
            })
          : t("entryCreate.customType.delete.description", { name })
      }
      cancelLabel={t("entryCreate.customType.delete.cancel")}
      confirmLabel={t("entryCreate.customType.delete.confirm")}
      pendingLabel={t("entryCreate.customType.delete.deleting")}
      isPending={isDeleting}
      failureMessage={failureMessage}
      onConfirm={() => void confirm()}
      onClose={onClose}
    />
  );
}
