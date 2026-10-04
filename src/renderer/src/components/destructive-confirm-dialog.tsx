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
 * 破坏性操作确认框的属性.
 */
interface DestructiveConfirmDialogProps {
  /**
   * 确认框的标题.
   */
  readonly title: string;
  /**
   * 说明文字, 写明要做什么以及无法恢复.
   */
  readonly description: string;
  /**
   * 取消按钮的文字.
   */
  readonly cancelLabel: string;
  /**
   * 确认按钮的文字.
   */
  readonly confirmLabel: string;
  /**
   * 操作进行中时确认按钮的文字.
   */
  readonly pendingLabel: string;
  /**
   * 操作是否正在进行, 进行中按钮禁用, 也不能经 Esc 关闭.
   */
  readonly isPending: boolean;
  /**
   * 最近一次操作失败的文案, 没有失败时为 undefined.
   */
  readonly failureMessage: string | undefined;
  /**
   * 用户点确认按钮时的回调.
   */
  readonly onConfirm: () => void;
  /**
   * 确认框要关闭时的回调, 取消或按 Esc 之后调用; 操作成功后的关闭由调用方自己决定.
   */
  readonly onClose: () => void;
}

/**
 * 破坏性操作的确认框, 挂载即打开, 关闭即卸载: 写明要做什么与无法恢复, 用户点确认才执行, 点取消或按
 * Esc 则什么都不做. 操作进行中按钮禁用并显示进行中的文案, 失败的原因显示在说明下方. 单个删除与
 * 批量删除共用.
 * @param props 组件属性.
 * @returns 确认框元素.
 */
export function DestructiveConfirmDialog(
  props: DestructiveConfirmDialogProps,
): React.JSX.Element {
  const { isPending, failureMessage, onClose } = props;
  const handleOpenChange = (isOpen: boolean): void => {
    if (!isOpen && !isPending) {
      onClose();
    }
  };
  return (
    <AlertDialog open onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{props.title}</AlertDialogTitle>
          <AlertDialogDescription className="break-words">
            {props.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {failureMessage !== undefined && (
          <Alert variant="destructive">
            <AlertDescription>{failureMessage}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {props.cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={props.onConfirm}
          >
            {isPending ? props.pendingLabel : props.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
