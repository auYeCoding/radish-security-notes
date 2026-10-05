import { useTranslation } from "react-i18next";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@renderer/components/ui/alert";

import { describeEmailBackupFailure } from "./describe-email-backup-failure";
import type { EmailBackupNotice } from "./email-backup-flow-state";
import { EmailBackupOversizePrompt } from "./email-backup-oversize-prompt";
import { EmailBackupResultSummary } from "./email-backup-result-summary";

/**
 * 状态区提示的属性.
 */
interface EmailBackupNoticeViewProps {
  /**
   * 要显示的提示.
   */
  readonly notice: EmailBackupNotice;
  /**
   * 超限后选 "去掉附件后再发" 的回调.
   */
  readonly onDropAttachments: () => void;
  /**
   * 超限后选 "取消" 的回调.
   */
  readonly onCancel: () => void;
}

/**
 * 状态区的提示: 设置已保存, 测试邮件已发出, 备份已发出的摘要, 超出邮箱上限的提示, 或失败原因.
 * 没有提示时什么也不显示.
 * @param props 组件属性.
 * @returns 提示元素.
 */
export function EmailBackupNoticeView(
  props: EmailBackupNoticeViewProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { notice } = props;
  switch (notice.kind) {
    case "saved":
      return (
        <Alert role="status">
          <AlertDescription>{t("emailBackup.saved")}</AlertDescription>
        </Alert>
      );
    case "test-sent":
      return (
        <Alert role="status">
          <AlertTitle>{t("emailBackup.testSent.title")}</AlertTitle>
          <AlertDescription>
            {t("emailBackup.testSent.description")}
          </AlertDescription>
        </Alert>
      );
    case "backup-sent":
      return <EmailBackupResultSummary summary={notice.summary} />;
    case "too-large":
      return (
        <EmailBackupOversizePrompt
          estimatedSizeBytes={notice.estimatedSizeBytes}
          limitBytes={notice.limitBytes}
          canDropAttachments={notice.canDropAttachments}
          onDropAttachments={props.onDropAttachments}
          onCancel={props.onCancel}
        />
      );
    case "failure":
      return (
        <Alert variant="destructive">
          <AlertDescription>
            {describeEmailBackupFailure(notice.reason, t)}
          </AlertDescription>
        </Alert>
      );
    default:
      return <></>;
  }
}
