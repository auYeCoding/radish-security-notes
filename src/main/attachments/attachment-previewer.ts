import {
  canPreviewAttachment,
  previewMimeType,
} from "@shared/attachments/attachment-kind";
import {
  attachmentFailed,
  attachmentSucceeded,
  type AttachmentResult,
} from "@shared/attachments/attachment-result";

import type { AttachmentService } from "./attachment-service";

/**
 * 附件预览器: 把可预览的图片附件做成 data: 地址交给渲染端显示. 这是 "附件内容只在主进程里读写"
 * 的唯一例外; 只有可预览的图片扩展名且不超过预览大小上限的附件才会读出内容.
 */
export class AttachmentPreviewer {
  /**
   * 创建预览器.
   * @param service 附件服务.
   */
  constructor(private readonly service: AttachmentService) {}

  /**
   * 读取一个图片附件的预览地址.
   * @param attachmentId 附件编号.
   * @returns data: 地址; 没有这个附件, 保险库未解锁, 不是可预览的图片或超过预览大小上限时为失败
   * 结果.
   */
  preview(attachmentId: string): AttachmentResult<string> {
    const meta = this.service.findMeta(attachmentId);
    if (!meta.ok) {
      return meta;
    }
    const mimeType = previewMimeType(meta.value.name);
    if (
      mimeType === undefined ||
      !canPreviewAttachment(meta.value.name, meta.value.size)
    ) {
      return attachmentFailed("not-previewable");
    }
    const stored = this.service.read(attachmentId);
    return stored.ok
      ? attachmentSucceeded(
          `data:${mimeType};base64,${stored.value.content.toString("base64")}`,
        )
      : stored;
  }
}
