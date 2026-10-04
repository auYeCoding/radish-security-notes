import type { AttachmentMeta } from "@shared/attachments/attachment-types";

import { AttachmentDeleteDialog } from "./attachment-delete-dialog";
import { AttachmentPreviewDialog } from "./attachment-preview-dialog";

/**
 * 附件区对话框的属性.
 */
interface AttachmentDialogsProps {
  /**
   * 正等待删除确认的附件, 没有时不显示确认框.
   */
  readonly pendingDelete: AttachmentMeta | undefined;
  /**
   * 正在预览的图片附件, 没有时不显示预览对话框.
   */
  readonly previewing: AttachmentMeta | undefined;
  /**
   * 执行删除, 成功时兑现 undefined, 失败时兑现失败文案.
   */
  readonly onDelete: (attachmentId: string) => Promise<string | undefined>;
  /**
   * 删除确认框要关闭时的回调.
   */
  readonly onCloseDelete: () => void;
  /**
   * 预览对话框要关闭时的回调.
   */
  readonly onClosePreview: () => void;
}

/**
 * 附件区的两个对话框: 删除确认框与图片预览对话框, 各自在有目标附件时挂载, 没有时卸载.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function AttachmentDialogs(
  props: AttachmentDialogsProps,
): React.JSX.Element {
  return (
    <>
      {props.pendingDelete !== undefined && (
        <AttachmentDeleteDialog
          attachment={props.pendingDelete}
          onDelete={props.onDelete}
          onClose={props.onCloseDelete}
        />
      )}
      {props.previewing !== undefined && (
        <AttachmentPreviewDialog
          attachment={props.previewing}
          onClose={props.onClosePreview}
        />
      )}
    </>
  );
}
