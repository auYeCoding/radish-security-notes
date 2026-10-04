import { useTranslation } from "react-i18next";

import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@renderer/components/ui/alert-dialog";

/**
 * 打开外部链接确认框的属性.
 */
interface ExternalLinkConfirmDialogProps {
  /**
   * 要打开的完整地址.
   */
  readonly url: string;
  /**
   * 是否正在打开, 进行中按钮禁用, 也不能经 Esc 关闭.
   */
  readonly isOpening: boolean;
  /**
   * 最近一次打开是否失败.
   */
  readonly hasFailed: boolean;
  /**
   * 用户点打开按钮时的回调.
   */
  readonly onConfirm: () => void;
  /**
   * 确认框要关闭时的回调, 取消或按 Esc 之后调用.
   */
  readonly onClose: () => void;
}

/**
 * 打开外部链接前的确认框, 挂载即打开, 关闭即卸载: 显示完整地址, 用户点打开才交给系统默认程序,
 * 点取消或按 Esc 则什么都不做. 打开失败的原因显示在地址下方.
 * @param props 组件属性.
 * @returns 确认框元素.
 */
export function ExternalLinkConfirmDialog(
  props: ExternalLinkConfirmDialogProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { isOpening, onClose } = props;
  const handleOpenChange = (isOpen: boolean): void => {
    if (!isOpen && !isOpening) {
      onClose();
    }
  };
  return (
    <AlertDialog open onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("markdown.openLink.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("markdown.openLink.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className="rounded-lg bg-muted p-2 font-mono text-xs break-all">
          {props.url}
        </p>
        {props.hasFailed && (
          <Alert variant="destructive">
            <AlertDescription>{t("markdown.openLink.failed")}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isOpening}>
            {t("markdown.openLink.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction disabled={isOpening} onClick={props.onConfirm}>
            {isOpening
              ? t("markdown.openLink.opening")
              : t("markdown.openLink.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
