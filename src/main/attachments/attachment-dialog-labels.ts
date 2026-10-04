import type { i18n } from "i18next";

/**
 * 附件的系统对话框用到的文案, 已按当前界面语言取好.
 */
export interface AttachmentDialogLabels {
  /**
   * 选择文件对话框的标题.
   */
  readonly openTitle: string;
  /**
   * 保存对话框的标题.
   */
  readonly saveTitle: string;
}

/**
 * 按主进程当前的界面语言读取附件对话框的文案. 每次弹出对话框时才读取, 这样切换语言后立即生效.
 * @param translator 主进程的 i18next 实例.
 * @returns 文案.
 */
export function readAttachmentDialogLabels(
  translator: i18n,
): AttachmentDialogLabels {
  return {
    openTitle: translator.t("entryAttachments.dialog.openTitle"),
    saveTitle: translator.t("entryAttachments.dialog.saveTitle"),
  };
}
