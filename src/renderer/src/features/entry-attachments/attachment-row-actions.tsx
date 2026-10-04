import {
  DownloadIcon,
  EyeIcon,
  ExternalLinkIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  canOpenAttachment,
  canPreviewAttachment,
} from "@shared/attachments/attachment-kind";
import type { AttachmentMeta } from "@shared/attachments/attachment-types";

import { IconActionButton } from "@renderer/components/icon-action-button";

/**
 * 附件行操作的属性.
 */
export interface AttachmentRowActionsProps {
  /**
   * 这一行的附件.
   */
  readonly attachment: AttachmentMeta;
  /**
   * 点预览按钮时的回调.
   */
  readonly onPreview: (attachment: AttachmentMeta) => void;
  /**
   * 点打开按钮时的回调.
   */
  readonly onOpen: (attachment: AttachmentMeta) => void;
  /**
   * 点另存为按钮时的回调.
   */
  readonly onSaveAs: (attachment: AttachmentMeta) => void;
  /**
   * 点删除按钮时的回调.
   */
  readonly onDelete: (attachment: AttachmentMeta) => void;
}

/**
 * 附件行末尾的操作按钮: 预览 (只给不超过预览上限的图片), 打开 (可执行类不给, 只能另存为), 另存为
 * 与删除. 每个按钮的名称都带附件名.
 * @param props 组件属性.
 * @returns 操作按钮组元素.
 */
export function AttachmentRowActions(
  props: AttachmentRowActionsProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { attachment } = props;
  const name = attachment.name;
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {canPreviewAttachment(name, attachment.size) && (
        <IconActionButton
          label={t("entryAttachments.actions.preview", { name })}
          onClick={() => props.onPreview(attachment)}
        >
          <EyeIcon aria-hidden="true" />
        </IconActionButton>
      )}
      {canOpenAttachment(name) && (
        <IconActionButton
          label={t("entryAttachments.actions.open", { name })}
          onClick={() => props.onOpen(attachment)}
        >
          <ExternalLinkIcon aria-hidden="true" />
        </IconActionButton>
      )}
      <IconActionButton
        label={t("entryAttachments.actions.saveAs", { name })}
        onClick={() => props.onSaveAs(attachment)}
      >
        <DownloadIcon aria-hidden="true" />
      </IconActionButton>
      <IconActionButton
        label={t("entryAttachments.actions.delete", { name })}
        onClick={() => props.onDelete(attachment)}
      >
        <Trash2Icon aria-hidden="true" />
      </IconActionButton>
    </div>
  );
}
