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
 * 放弃修改确认框的属性.
 */
interface DiscardChangesDialogProps {
  /**
   * 确认框是否打开.
   */
  readonly open: boolean;
  /**
   * 确认框开合状态变化时的回调.
   */
  readonly onOpenChange: (open: boolean) => void;
  /**
   * 点击 "放弃修改" 时的回调.
   */
  readonly onConfirm: () => void;
}

/**
 * 编辑条目时, 表单有未保存修改却要关闭的确认框: 说明关闭后修改不会保存, 用户选择 "继续编辑"
 * 回到表单, 或选择 "放弃修改" 关闭编辑对话框.
 * @param props 组件属性.
 * @returns 确认框元素.
 */
export function DiscardChangesDialog(
  props: DiscardChangesDialogProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("entryEdit.discard.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("entryEdit.discard.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {t("entryEdit.discard.keepEditing")}
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={props.onConfirm}>
            {t("entryEdit.discard.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
