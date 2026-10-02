import { useTranslation } from "react-i18next";

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
 * 跳过确认框的属性.
 */
interface SkipConfirmDialogProps {
  /**
   * 确认框是否打开.
   */
  readonly open: boolean;
  /**
   * 确认框开合状态变化时的回调.
   */
  readonly onOpenChange: (open: boolean) => void;
  /**
   * 点击确认按钮时的回调.
   */
  readonly onConfirm: () => void;
  /**
   * 跳过操作是否正在执行, 执行中禁用按钮.
   */
  readonly isPending: boolean;
}

/**
 * 跳过主密码的确认框: 写明跳过后数据仍加密, 但能登录当前 Windows 账户的人可直接打开应用,
 * 用户确认后才执行跳过. 首次设置要等系统密钥落盘, 可能持续十几秒, 期间确认按钮显示处理中
 * 的文案并禁用. 引导页与凭恢复词恢复后的设置页共用.
 * @param props 组件属性.
 * @returns 确认框元素.
 */
export function SkipConfirmDialog(
  props: SkipConfirmDialogProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("vault.skipConfirm.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("vault.skipConfirm.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={props.isPending}>
            {t("vault.skipConfirm.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={props.isPending}
            onClick={props.onConfirm}
          >
            {props.isPending
              ? t("vault.onboarding.submitting")
              : t("vault.skipConfirm.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
