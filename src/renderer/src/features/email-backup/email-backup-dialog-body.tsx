import { useTranslation } from "react-i18next";

import { DialogScrollBody } from "@renderer/components/scrollable-dialog";
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
 * 对话框正文: 读取设置期间显示 "正在读取", 读取失败时显示失败提示, 读到后是可滚动的表单与状态区, 其下是
 * 固定的操作区.
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
          <DialogScrollBody className="gap-4">
            <EmailBackupForm flow={flow} />
            <EmailBackupStatus flow={flow} />
          </DialogScrollBody>
          <EmailBackupActions flow={flow} />
        </>
      );
  }
}
