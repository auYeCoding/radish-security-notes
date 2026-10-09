import { useTranslation } from "react-i18next";

import { ScrollableDialogContent } from "@renderer/components/scrollable-dialog";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@renderer/components/ui/dialog";

import { EmailBackupDialogBody } from "./email-backup-dialog-body";
import { useEmailBackupFlow } from "./use-email-backup-flow";

/**
 * 邮箱备份对话框的属性.
 */
interface EmailBackupDialogProps {
  /**
   * 对话框要关闭时的回调.
   */
  readonly onClose: () => void;
}

/**
 * 邮箱备份对话框, 挂载即打开, 关闭即卸载: 承载邮箱设置, 发送测试邮件与立即备份. 主进程处理期间
 * (保存, 发送测试邮件, 备份) 不能关闭; 其余时候关闭对话框会让流程状态 (含授权码, 口令与主密码)
 * 随组件卸载丢弃. 标题与底部按钮行固定, 内容较多时只有中间的正文滚动.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function EmailBackupDialog(
  props: EmailBackupDialogProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const flow = useEmailBackupFlow();
  const isWorking = flow.state.activity !== "idle";
  const handleOpenChange = (isOpen: boolean): void => {
    if (!isOpen && !isWorking) {
      props.onClose();
    }
  };
  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <ScrollableDialogContent
        closeLabel={t("common.close")}
        showCloseButton={!isWorking}
        className="sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>{t("emailBackup.dialog.title")}</DialogTitle>
          <DialogDescription>
            {t("emailBackup.dialog.description")}
          </DialogDescription>
        </DialogHeader>
        <EmailBackupDialogBody flow={flow} />
      </ScrollableDialogContent>
    </Dialog>
  );
}
