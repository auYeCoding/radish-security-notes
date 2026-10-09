import { useTranslation } from "react-i18next";

import { ScrollableDialogContent } from "@renderer/components/scrollable-dialog";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@renderer/components/ui/dialog";

import { ExportStepView } from "./export-step-view";
import { useExportFlow } from "./use-export-flow";

/**
 * 导出对话框的属性.
 */
interface ExportDialogProps {
  /**
   * 对话框要关闭时的回调.
   */
  readonly onClose: () => void;
}

/**
 * 导出对话框, 挂载即打开, 关闭即卸载: 承载 "选格式与范围, 确认, 导出, 结果" 的流程. 主进程处理期间
 * 只能点 "取消" 中止, 不能直接关闭; 其余时候关闭对话框会让主进程忘掉最近一次导出的路径, 流程状态
 * (含加密口令与主密码) 随组件卸载丢弃. 标题与底部按钮行固定, 内容较多时只有中间的正文滚动.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function ExportDialog(props: ExportDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const flow = useExportFlow();
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
          <DialogTitle>{t("export.dialog.title")}</DialogTitle>
          <DialogDescription>
            {t("export.dialog.description")}
          </DialogDescription>
        </DialogHeader>
        <ExportStepView flow={flow} onDone={close} />
      </ScrollableDialogContent>
    </Dialog>
  );
}
