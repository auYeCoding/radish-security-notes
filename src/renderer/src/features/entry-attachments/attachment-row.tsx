import { useTranslation } from "react-i18next";

import type { AttachmentMeta } from "@shared/attachments/attachment-types";

import { formatByteSize } from "@renderer/components/format-byte-size";

import { AttachmentKindIcon } from "./attachment-kind-icon";
import {
  AttachmentRowActions,
  type AttachmentRowActionsProps,
} from "./attachment-row-actions";

/**
 * 附件行的属性: 这一行的附件与各个操作的回调.
 */
type AttachmentRowProps = AttachmentRowActionsProps;

/**
 * 附件列表里的一行: 类型图标, 名称 (过长时换行), 大小, 以及操作按钮.
 * @param props 组件属性.
 * @returns 列表项元素.
 */
export function AttachmentRow(props: AttachmentRowProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const attachment: AttachmentMeta = props.attachment;
  return (
    <li className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
      <AttachmentKindIcon name={attachment.name} />
      <span className="min-w-0 flex-1 text-sm break-words">
        {attachment.name}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatByteSize(attachment.size, t, i18n.language)}
      </span>
      <AttachmentRowActions {...props} />
    </li>
  );
}
