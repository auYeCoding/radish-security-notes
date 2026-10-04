import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { BatchActionButton } from "./batch-action-button";
import { BatchDeleteDialog } from "./batch-delete-dialog";

/**
 * 批量删除入口的属性.
 */
interface BatchDeleteButtonProps {
  /**
   * 要删除的条目编号.
   */
  readonly entryIds: readonly string[];
  /**
   * 是否禁用.
   */
  readonly isDisabled: boolean;
}

/**
 * 批量删除的入口: 垃圾桶图标按钮, 名称放在无障碍标签与悬停提示里; 点击打开写明条目数的删除确认框.
 * @param props 组件属性.
 * @returns 入口按钮与确认框元素.
 */
export function BatchDeleteButton(
  props: BatchDeleteButtonProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <BatchActionButton
        label={t("batch.delete")}
        icon={<Trash2Icon aria-hidden="true" />}
        isDisabled={props.isDisabled}
        onClick={() => setIsOpen(true)}
      />
      {isOpen && (
        <BatchDeleteDialog
          entryIds={props.entryIds}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
