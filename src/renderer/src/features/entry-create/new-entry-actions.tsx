import { useTranslation } from "react-i18next";

import { Button } from "@renderer/components/ui/button";
import { DialogClose, DialogFooter } from "@renderer/components/ui/dialog";

/**
 * 新建表单操作区的属性.
 */
interface NewEntryActionsProps {
  /**
   * 保存是否正在执行, 执行中禁用按钮并显示处理中的文案.
   */
  readonly isSubmitting: boolean;
}

/**
 * 新建对话框的底部操作区: 取消与保存按钮.
 * @param props 组件属性.
 * @returns 操作区元素.
 */
export function NewEntryActions(
  props: NewEntryActionsProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <DialogFooter>
      <DialogClose
        render={
          <Button
            type="button"
            variant="outline"
            disabled={props.isSubmitting}
          />
        }
      >
        {t("entryCreate.cancel")}
      </DialogClose>
      <Button type="submit" disabled={props.isSubmitting}>
        {props.isSubmitting
          ? t("entryCreate.submitting")
          : t("entryCreate.submit")}
      </Button>
    </DialogFooter>
  );
}
