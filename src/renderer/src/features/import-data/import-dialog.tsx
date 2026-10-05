import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@renderer/components/ui/dialog";

import { ImportStepView } from "./import-step-view";
import { useImportFlow } from "./use-import-flow";

/**
 * 导入对话框的属性.
 */
interface ImportDialogProps {
  /**
   * 对话框要关闭时的回调.
   */
  readonly onClose: () => void;
}

/**
 * 导入对话框, 挂载即打开, 关闭即卸载: 承载 "选择来源, 选择文件并解析, 预览, 确认, 结果" 的流程.
 * 主进程处理期间不能关闭; 其余时候关闭对话框会让主进程释放解析结果与保留的信息, 流程状态随组件
 * 卸载丢弃.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function ImportDialog(props: ImportDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const flow = useImportFlow();
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
      <DialogContent
        closeLabel={t("common.close")}
        showCloseButton={!isWorking}
        className="sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>{t("import.dialog.title")}</DialogTitle>
          <DialogDescription>
            {t("import.dialog.description")}
          </DialogDescription>
        </DialogHeader>
        <ImportStepView flow={flow} onDone={close} />
      </DialogContent>
    </Dialog>
  );
}
