import { useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@renderer/components/ui/alert-dialog";

/**
 * 无法锁定提示框的属性.
 */
interface LockBlockedDialogProps {
  /**
   * 无法锁定的原因, 已换成当前语言的文案.
   */
  readonly message: string;
  /**
   * 提示框要关闭时的回调, 点 "知道了" 或按 Esc 之后调用.
   */
  readonly onClose: () => void;
}

/**
 * 无法锁定的提示框, 挂载即打开, 关闭即卸载: 写明为什么没有锁定 (有任务进行中, 未设主密码等),
 * 用户点 "知道了" 或按 Esc 关闭, 保险库保持解锁.
 * @param props 组件属性.
 * @returns 提示框元素.
 */
export function LockBlockedDialog(
  props: LockBlockedDialogProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { onClose } = props;
  const handleOpenChange = (isOpen: boolean): void => {
    if (!isOpen) {
      onClose();
    }
  };
  return (
    <AlertDialog open onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("vault.lock.blocked.title")}</AlertDialogTitle>
          <AlertDialogDescription className="break-words">
            {props.message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("vault.lock.blocked.close")}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
