import { useTranslation } from "react-i18next";

import type { AttachmentMeta } from "@shared/attachments/attachment-types";

import { AttachmentRow } from "./attachment-row";
import type { AttachmentRowActionsProps } from "./attachment-row-actions";
import type { AttachmentListStatus } from "./use-attachment-list";

/**
 * 附件列表的属性.
 */
interface AttachmentListProps extends Omit<
  AttachmentRowActionsProps,
  "attachment"
> {
  /**
   * 附件列表的读取状态.
   */
  readonly status: AttachmentListStatus;
  /**
   * 已读到的附件元数据.
   */
  readonly attachments: readonly AttachmentMeta[];
}

/**
 * 附件区的主体: 读取中不显示内容, 读取失败时说明原因, 没有附件时显示空状态说明, 否则按添加顺序列出
 * 每个附件一行.
 * @param props 组件属性.
 * @returns 主体元素, 读取中时为 null.
 */
export function AttachmentList(
  props: AttachmentListProps,
): React.JSX.Element | null {
  const { t } = useTranslation();
  const { status, attachments, ...handlers } = props;
  if (status === "loading") {
    return null;
  }
  if (status === "failed") {
    return (
      <p className="text-sm text-muted-foreground">
        {t("entryAttachments.loadFailed")}
      </p>
    );
  }
  if (attachments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("entryAttachments.empty")}
      </p>
    );
  }
  return (
    <ul className="flex flex-col">
      {attachments.map((attachment) => (
        <AttachmentRow
          key={attachment.id}
          attachment={attachment}
          {...handlers}
        />
      ))}
    </ul>
  );
}
