import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  createEditEntrySchema,
  type EditEntryFormValues,
} from "@shared/entries/edit-entry-schema";
import type { EntryDetail } from "@shared/entries/entry-types";
import { requireEntryType } from "@shared/entries/preset-entry-types";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@renderer/components/ui/dialog";

import { DiscardChangesDialog } from "./discard-changes-dialog";
import { createEditFormValues } from "./edit-entry-values";
import { EditEntryForm } from "./edit-entry-form";

/**
 * 编辑对话框的属性.
 */
interface EditEntryDialogProps {
  /**
   * 要编辑的条目详情, 表单以它的现值为初始取值.
   */
  readonly detail: EntryDetail;
  /**
   * 对话框要关闭时的回调, 保存成功或用户确认放弃修改之后调用.
   */
  readonly onClose: () => void;
}

/**
 * 编辑条目的对话框, 挂载即打开, 关闭即卸载, 所以每次打开都以条目的最新现值为初始取值. 表单有
 * 未保存的修改时, 取消, 按 Esc, 点遮罩或点关闭按钮都先弹出放弃修改的确认, 没有修改则直接关闭;
 * 保存进行中不响应关闭. 宽度与新建对话框一致.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function EditEntryDialog(
  props: EditEntryDialogProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { detail, onClose } = props;
  const schema = useMemo(
    () => createEditEntrySchema(requireEntryType(detail.type)),
    [detail.type],
  );
  const form = useForm<EditEntryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: createEditFormValues(detail),
  });
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const { isDirty, isSubmitting } = form.formState;
  const handleOpenChange = (isOpen: boolean): void => {
    if (isOpen || isSubmitting) {
      return;
    }
    if (isDirty) {
      setIsDiscardOpen(true);
      return;
    }
    onClose();
  };
  return (
    <>
      <Dialog open onOpenChange={handleOpenChange}>
        <DialogContent closeLabel={t("common.close")} className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("entryEdit.title")}</DialogTitle>
            <DialogDescription>{t("entryEdit.description")}</DialogDescription>
          </DialogHeader>
          <FormProvider {...form}>
            <EditEntryForm detail={detail} onSaved={onClose} />
          </FormProvider>
        </DialogContent>
      </Dialog>
      <DiscardChangesDialog
        open={isDiscardOpen}
        onOpenChange={setIsDiscardOpen}
        onConfirm={onClose}
      />
    </>
  );
}
