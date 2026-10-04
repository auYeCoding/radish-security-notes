import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { AttachmentMeta } from "@shared/attachments/attachment-types";

import { DismissibleAlert } from "@renderer/components/dismissible-alert";

import { AttachmentDialogs } from "./attachment-dialogs";
import { AttachmentDropZone } from "./attachment-drop-zone";
import { AttachmentList } from "./attachment-list";
import { AttachmentSectionHeader } from "./attachment-section-header";
import { useAttachments } from "./use-attachments";

/**
 * 附件区的属性.
 */
interface AttachmentSectionProps {
  /**
   * 附件所属条目的编号.
   */
  readonly entryId: string;
}

/**
 * 条目详情里的附件区: 标题行带个数与添加按钮, 失败提示条, 附件列表或空状态说明, 整个区域可以接受
 * 拖入的文件. 每行可以预览 (图片), 打开 (可执行类除外), 另存为与删除, 删除先弹确认框, 预览在对话框
 * 里. 附件内容留在主进程, 这里只有元数据. 调用方用条目编号作 key, 切换条目时整个区域重新挂载.
 * @param props 组件属性.
 * @returns 附件区元素.
 */
export function AttachmentSection(
  props: AttachmentSectionProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const controller = useAttachments(props.entryId);
  const [pendingDelete, setPendingDelete] = useState<
    AttachmentMeta | undefined
  >(undefined);
  const [previewing, setPreviewing] = useState<AttachmentMeta | undefined>(
    undefined,
  );
  return (
    <AttachmentDropZone
      label={t("entryAttachments.sectionLabel")}
      dropHint={t("entryAttachments.dropActive")}
      isDisabled={controller.isAdding}
      onDropFiles={(files) => void controller.addDropped(files)}
    >
      <AttachmentSectionHeader
        count={controller.attachments.length}
        isAdding={controller.isAdding}
        onAdd={() => void controller.addFromDialog()}
      />
      {controller.failureMessage !== undefined && (
        <DismissibleAlert
          message={controller.failureMessage}
          dismissLabel={t("entryAttachments.dismiss")}
          onDismiss={controller.dismissFailure}
        />
      )}
      <AttachmentList
        status={controller.status}
        attachments={controller.attachments}
        onPreview={setPreviewing}
        onOpen={(attachment) => void controller.open(attachment.id)}
        onSaveAs={(attachment) => void controller.saveAs(attachment.id)}
        onDelete={setPendingDelete}
      />
      <AttachmentDialogs
        pendingDelete={pendingDelete}
        previewing={previewing}
        onDelete={controller.remove}
        onCloseDelete={() => setPendingDelete(undefined)}
        onClosePreview={() => setPreviewing(undefined)}
      />
    </AttachmentDropZone>
  );
}
