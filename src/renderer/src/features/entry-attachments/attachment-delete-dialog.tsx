import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { AttachmentMeta } from "@shared/attachments/attachment-types";

import { DestructiveConfirmDialog } from "@renderer/components/destructive-confirm-dialog";

/**
 * 删除附件确认框的属性.
 */
interface AttachmentDeleteDialogProps {
  /**
   * 要删除的附件.
   */
  readonly attachment: AttachmentMeta;
  /**
   * 执行删除, 成功时兑现 undefined, 失败时兑现失败文案.
   */
  readonly onDelete: (attachmentId: string) => Promise<string | undefined>;
  /**
   * 确认框要关闭时的回调, 取消, 按 Esc 或删除成功之后调用.
   */
  readonly onClose: () => void;
}

/**
 * 删除附件的确认框, 挂载即打开, 关闭即卸载: 写明附件名称和删除后无法恢复, 用户点 "删除" 才执行,
 * 点 "取消" 或按 Esc 则保留附件. 删除进行中按钮禁用并显示处理中的文案, 失败的原因显示在说明下方.
 * 外观与交互由共用的破坏性操作确认框提供.
 * @param props 组件属性.
 * @returns 确认框元素.
 */
export function AttachmentDeleteDialog(
  props: AttachmentDeleteDialogProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { attachment, onDelete, onClose } = props;
  const [isDeleting, setIsDeleting] = useState(false);
  const [failureMessage, setFailureMessage] = useState<string | undefined>(
    undefined,
  );
  const confirm = async (): Promise<void> => {
    setIsDeleting(true);
    setFailureMessage(undefined);
    const failure = await onDelete(attachment.id);
    if (failure === undefined) {
      onClose();
      return;
    }
    setIsDeleting(false);
    setFailureMessage(failure);
  };
  return (
    <DestructiveConfirmDialog
      title={t("entryAttachments.delete.title")}
      description={t("entryAttachments.delete.description", {
        name: attachment.name,
      })}
      cancelLabel={t("entryAttachments.delete.cancel")}
      confirmLabel={t("entryAttachments.delete.confirm")}
      pendingLabel={t("entryAttachments.delete.deleting")}
      isPending={isDeleting}
      failureMessage={failureMessage}
      onConfirm={() => void confirm()}
      onClose={onClose}
    />
  );
}
