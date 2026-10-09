import { useTranslation } from "react-i18next";

import type { AttachmentMeta } from "@shared/attachments/attachment-types";

import {
  DialogScrollBody,
  ScrollableDialogContent,
} from "@renderer/components/scrollable-dialog";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@renderer/components/ui/dialog";

import {
  useAttachmentPreview,
  type AttachmentPreviewState,
} from "./use-attachment-preview";

/**
 * 图片预览对话框的属性.
 */
interface AttachmentPreviewDialogProps {
  /**
   * 要预览的图片附件.
   */
  readonly attachment: AttachmentMeta;
  /**
   * 对话框要关闭时的回调.
   */
  readonly onClose: () => void;
}

/**
 * 预览区域的内容属性.
 */
interface PreviewBodyProps {
  /**
   * 预览的读取状态.
   */
  readonly state: AttachmentPreviewState;
  /**
   * 图片附件的名称, 用作图片的替代文字.
   */
  readonly name: string;
}

/**
 * 预览区域: 读取中显示说明, 失败显示原因, 读到后显示图片.
 * @param props 组件属性.
 * @returns 预览区域元素.
 */
function PreviewBody(props: PreviewBodyProps): React.JSX.Element {
  const { t } = useTranslation();
  const { state } = props;
  if (state.status === "loading") {
    return (
      <p className="text-sm text-muted-foreground">
        {t("entryAttachments.preview.loading")}
      </p>
    );
  }
  if (state.status === "failed") {
    return <p className="text-sm text-destructive">{state.message}</p>;
  }
  return (
    <img
      src={state.dataUrl}
      alt={t("entryAttachments.preview.imageAlt", { name: props.name })}
      className="mx-auto max-h-96 max-w-full object-contain"
    />
  );
}

/**
 * 图片附件的预览对话框, 挂载即打开, 关闭即卸载: 挂载时向主进程取预览地址, 关闭后地址随组件丢弃,
 * 不在详情里留存. 这是附件内容进入渲染端的唯一场合.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function AttachmentPreviewDialog(
  props: AttachmentPreviewDialogProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { attachment, onClose } = props;
  const state = useAttachmentPreview(attachment.id);
  const handleOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      onClose();
    }
  };
  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <ScrollableDialogContent
        closeLabel={t("common.close")}
        className="sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle className="break-words">
            {t("entryAttachments.preview.title", { name: attachment.name })}
          </DialogTitle>
          <DialogDescription>
            {t("entryAttachments.preview.description")}
          </DialogDescription>
        </DialogHeader>
        <DialogScrollBody>
          <PreviewBody state={state} name={attachment.name} />
        </DialogScrollBody>
      </ScrollableDialogContent>
    </Dialog>
  );
}
