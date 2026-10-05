import { useTranslation } from "react-i18next";

import { formatByteSize } from "@renderer/components/format-byte-size";
import { Button } from "@renderer/components/ui/button";
import { WarningAlert } from "@renderer/components/warning-alert";

/**
 * 超限提示的属性.
 */
interface EmailBackupOversizePromptProps {
  /**
   * 估计的邮件字节数.
   */
  readonly estimatedSizeBytes: number;
  /**
   * 设置的单封上限的字节数.
   */
  readonly limitBytes: number;
  /**
   * 去掉附件后重发是否还有意义.
   */
  readonly canDropAttachments: boolean;
  /**
   * 选 "去掉附件后再发" 的回调.
   */
  readonly onDropAttachments: () => void;
  /**
   * 选 "取消" 的回调.
   */
  readonly onCancel: () => void;
}

/**
 * 备份超出邮箱上限的提示: 写明当前大小与上限, 没有发送; 给 "去掉附件后再发" 与 "取消" 两个选项,
 * 备份本来就不含附件时不再提供前一个, 并提示调高上限或减少条目.
 * @param props 组件属性.
 * @returns 提示元素.
 */
export function EmailBackupOversizePrompt(
  props: EmailBackupOversizePromptProps,
): React.JSX.Element {
  const { t, i18n } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <WarningAlert
        title={t("emailBackup.oversize.title")}
        description={t("emailBackup.oversize.description", {
          size: formatByteSize(props.estimatedSizeBytes, t, i18n.language),
          limit: formatByteSize(props.limitBytes, t, i18n.language),
        })}
      />
      {!props.canDropAttachments && (
        <p className="text-sm text-muted-foreground">
          {t("emailBackup.oversize.cannotDrop")}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={props.onCancel}>
          {t("emailBackup.oversize.cancel")}
        </Button>
        {props.canDropAttachments && (
          <Button onClick={props.onDropAttachments}>
            {t("emailBackup.oversize.dropAttachments")}
          </Button>
        )}
      </div>
    </div>
  );
}
