import { useTranslation } from "react-i18next";

import { Alert, AlertDescription } from "@renderer/components/ui/alert";

import { EmailBackupActions } from "./email-backup-actions";
import { EmailBackupForm } from "./email-backup-form";
import { EmailBackupStatus } from "./email-backup-status";
import type { EmailBackupFlow } from "./use-email-backup-flow";

/**
 * 对话框正文的属性.
 */
interface EmailBackupDialogBodyProps {
  /**
   * 邮箱备份对话框的流程.
   */
  readonly flow: EmailBackupFlow;
}

/**
 * 对话框正文: 读取设置期间显示 "正在读取", 读取失败时显示失败提示, 读到后是表单, 状态区与操作区.
 * @param props 组件属性.
 * @returns 正文元素.
 */
export function EmailBackupDialogBody(
  props: EmailBackupDialogBodyProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { flow } = props;
  switch (flow.state.loadStatus) {
    case "loading":
      return (
        <p role="status" className="text-sm text-muted-foreground">
          {t("emailBackup.dialog.loading")}
        </p>
      );
    case "failed":
      return (
        <Alert variant="destructive">
          <AlertDescription>
            {t("emailBackup.dialog.loadFailed")}
          </AlertDescription>
        </Alert>
      );
    default:
      return (
        <>
          <EmailBackupForm flow={flow} />
          <EmailBackupStatus flow={flow} />
          <EmailBackupActions flow={flow} />
        </>
      );
  }
}
