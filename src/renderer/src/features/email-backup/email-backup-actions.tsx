import { useTranslation } from "react-i18next";

import { Button } from "@renderer/components/ui/button";
import { DialogFooter } from "@renderer/components/ui/dialog";

import {
  canRunBackup,
  canSaveDraft,
  canSendTest,
  isDraftDirty,
} from "./email-backup-draft-rules";
import type { EmailBackupFlow } from "./use-email-backup-flow";

/**
 * 操作区的属性.
 */
interface EmailBackupActionsProps {
  /**
   * 邮箱备份对话框的流程.
   */
  readonly flow: EmailBackupFlow;
}

/**
 * 操作区: "保存设置", "发送测试邮件", "立即备份" 三个按钮. 处理期间全部不可点; 发送测试邮件与立即
 * 备份用的是已保存的设置, 所以有未保存的修改时不可点并提示先保存.
 * @param props 组件属性.
 * @returns 操作区元素.
 */
export function EmailBackupActions(
  props: EmailBackupActionsProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { flow } = props;
  const { draft, view, activity } = flow.state;
  const isIdle = activity === "idle";
  return (
    <>
      {view.isSaved && isDraftDirty(draft, view) && (
        <p className="text-sm text-muted-foreground">
          {t("emailBackup.actions.unsavedHint")}
        </p>
      )}
      <DialogFooter>
        <Button
          variant="outline"
          disabled={!isIdle || !canSaveDraft(draft, view)}
          onClick={() => void flow.save()}
        >
          {t("emailBackup.actions.save")}
        </Button>
        <Button
          variant="outline"
          disabled={!isIdle || !canSendTest(draft, view)}
          onClick={() => void flow.sendTest()}
        >
          {t("emailBackup.actions.sendTest")}
        </Button>
        <Button
          disabled={!isIdle || !canRunBackup(draft, view)}
          onClick={() => void flow.runBackup(false)}
        >
          {t("emailBackup.actions.runBackup")}
        </Button>
      </DialogFooter>
    </>
  );
}
