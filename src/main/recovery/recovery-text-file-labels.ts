import type { i18n } from "i18next";

/**
 * 恢复词文本文件与保存对话框用到的文案, 已按当前界面语言取好.
 */
export interface RecoveryTextFileLabels {
  /**
   * 文件开头的标题.
   */
  readonly title: string;
  /**
   * 带生成日期的一行说明.
   */
  readonly generated: string;
  /**
   * 说明如何使用这些词的一段文字.
   */
  readonly usage: string;
  /**
   * 泄露警示语, 与展示页与打印套件共用同一版.
   */
  readonly warning: string;
  /**
   * 系统保存对话框的标题.
   */
  readonly dialogTitle: string;
  /**
   * 保存对话框文件类型过滤器里的名称.
   */
  readonly fileTypeName: string;
}

/**
 * 按主进程当前的界面语言读取文本文件的文案. 每次保存时才读取, 这样切换语言后立即生效.
 * @param translator 主进程的 i18next 实例.
 * @param generatedDate 生成日期, 形如 `2026-10-02`.
 * @returns 文案.
 */
export function readRecoveryTextFileLabels(
  translator: i18n,
  generatedDate: string,
): RecoveryTextFileLabels {
  return {
    title: translator.t("vault.recovery.title"),
    generated: translator.t("vault.recovery.generated", {
      date: generatedDate,
    }),
    usage: translator.t("vault.recovery.usage"),
    warning: translator.t("vault.recovery.warning"),
    dialogTitle: translator.t("vault.recovery.file.dialogTitle"),
    fileTypeName: translator.t("vault.recovery.file.fileTypeName"),
  };
}
