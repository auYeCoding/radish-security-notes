import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  createEditEntrySchema,
  type EditEntryFormValues,
} from "@shared/entries/edit-entry-schema";
import type { EntryTypeDefinition } from "@shared/entries/entry-field-types";
import type { EntryDetail } from "@shared/entries/entry-types";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@renderer/components/ui/dialog";
import { useEntryTypeCatalog } from "@renderer/stores/use-entry-type-catalog";

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
 * 已确定条目类型的编辑对话框的属性.
 */
interface EditEntryDialogContentProps extends EditEntryDialogProps {
  /**
   * 条目的类型定义, 表单的字段与校验方案都来自它.
   */
  readonly type: EntryTypeDefinition;
}

/**
 * 已确定条目类型的编辑对话框, 挂载即打开, 关闭即卸载, 所以每次打开都以条目的最新现值为初始取值.
 * 表单有未保存的修改时, 取消, 按 Esc, 点遮罩或点关闭按钮都先弹出放弃修改的确认, 没有修改则直接
 * 关闭; 保存进行中不响应关闭. 宽度与新建对话框一致.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
function EditEntryDialogContent(
  props: EditEntryDialogContentProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { detail, type, onClose } = props;
  const schema = useMemo(() => createEditEntrySchema(type), [type]);
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
            <EditEntryForm detail={detail} type={type} onSaved={onClose} />
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

/**
 * 编辑条目的对话框: 经类型目录取得条目的类型 (预设或自定义), 取得后渲染编辑对话框, 目录里没有
 * 这个类型时不渲染.
 * @param props 组件属性.
 * @returns 对话框元素, 条目的类型不在目录里时为 null.
 */
export function EditEntryDialog(
  props: EditEntryDialogProps,
): React.JSX.Element | null {
  const type = useEntryTypeCatalog().find(props.detail.type);
  return type === undefined ? null : (
    <EditEntryDialogContent {...props} type={type} />
  );
}
