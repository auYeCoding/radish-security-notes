import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@renderer/components/ui/dialog";

import { NewEntryForm } from "./new-entry-form";

/**
 * 新建对话框的属性.
 */
interface NewEntryDialogProps {
  /**
   * 对话框当前是否打开.
   */
  readonly isOpen: boolean;
  /**
   * 对话框开合状态变化时的回调.
   */
  readonly onOpenChange: (isOpen: boolean) => void;
}

/**
 * 新建条目的对话框: 标题, 说明与新建表单. 为容纳自定义字段, 宽度比默认对话框大一档. 关闭后
 * 表单卸载, 下次打开是空表单.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function NewEntryDialog(props: NewEntryDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Dialog open={props.isOpen} onOpenChange={props.onOpenChange}>
      <DialogContent closeLabel={t("common.close")} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("entryCreate.title")}</DialogTitle>
          <DialogDescription>{t("entryCreate.description")}</DialogDescription>
        </DialogHeader>
        <NewEntryForm onCreated={() => props.onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
