import { useTranslation } from "react-i18next";

import { ScrollableDialogContent } from "@renderer/components/scrollable-dialog";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@renderer/components/ui/dialog";

import { RestoreStepView } from "./restore-step-view";
import { useRestoreFlow } from "./use-restore-flow";

/**
 * 恢复对话框的属性.
 */
interface RestoreDialogProps {
  /**
   * 对话框要关闭时的回调.
   */
  readonly onClose: () => void;
}

/**
 * 恢复对话框, 挂载即打开, 关闭即卸载: 承载 "选择文件, 输入口令, 预览, 确认, 结果" 的流程.
 * 主进程处理期间不能关闭; 其余时候关闭对话框会让主进程释放所选文件与读出的备份, 流程状态 (含口令
 * 与主密码) 随组件卸载丢弃. 标题与底部按钮行固定, 内容较多时只有中间的正文滚动.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function RestoreDialog(props: RestoreDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const flow = useRestoreFlow();
  const isWorking = flow.state.step === "working";
  const close = (): void => {
    flow.release();
    props.onClose();
  };
  const handleOpenChange = (isOpen: boolean): void => {
    if (!isOpen && !isWorking) {
      close();
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
          <DialogTitle>{t("restore.dialog.title")}</DialogTitle>
          <DialogDescription>
            {t("restore.dialog.description")}
          </DialogDescription>
        </DialogHeader>
        <RestoreStepView flow={flow} onDone={close} />
      </ScrollableDialogContent>
    </Dialog>
  );
}
