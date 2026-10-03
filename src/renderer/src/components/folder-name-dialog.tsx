import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  createFolderNameSchema,
  type FolderNameFormValues,
} from "@shared/folders/folder-name-schema";

import { describeFolderNameError } from "@renderer/components/folder-name-errors";
import { TextField } from "@renderer/components/text-field";
import { Button } from "@renderer/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@renderer/components/ui/dialog";

/**
 * 文件夹名称对话框的属性.
 */
interface FolderNameDialogProps {
  /**
   * 对话框标题.
   */
  readonly title: string;
  /**
   * 标题下的说明.
   */
  readonly description: string;
  /**
   * 提交按钮的文字.
   */
  readonly submitLabel: string;
  /**
   * 提交执行中提交按钮的文字.
   */
  readonly submittingLabel: string;
  /**
   * 名称输入框里的初始取值, 新建时为空串, 重命名时是现在的名称.
   */
  readonly initialName: string;
  /**
   * 最近一次提交失败的文案 (例如重名), 没有失败时为 undefined, 显示在名称输入框下方.
   */
  readonly failureMessage: string | undefined;
  /**
   * 用校验后的名称提交, 成功时由调用方负责关闭对话框.
   */
  readonly onSubmit: (name: string) => Promise<void>;
  /**
   * 对话框要关闭时的回调, 取消, 按 Esc, 点遮罩或点关闭按钮之后调用.
   */
  readonly onClose: () => void;
}

/**
 * 对话框内容的属性: 在对话框属性之外带上表单对象, 不含关闭回调.
 */
interface FolderNameDialogBodyProps extends Omit<
  FolderNameDialogProps,
  "initialName" | "onClose"
> {
  /**
   * 名称表单, 由外层的对话框创建.
   */
  readonly form: UseFormReturn<FolderNameFormValues>;
}

/**
 * 对话框的内容: 标题与说明, 名称输入框, 取消与提交按钮. 名称为空或超长时错误显示在输入框下方.
 * @param props 组件属性.
 * @returns 对话框内容元素.
 */
function FolderNameDialogBody(
  props: FolderNameDialogBodyProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { form } = props;
  const { isSubmitting } = form.formState;
  const validationError = describeFolderNameError(
    form.formState.errors.name?.message,
    t,
  );
  return (
    <>
      <DialogHeader>
        <DialogTitle>{props.title}</DialogTitle>
        <DialogDescription>{props.description}</DialogDescription>
      </DialogHeader>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) =>
          void form.handleSubmit((values) => props.onSubmit(values.name))(event)
        }
      >
        <TextField
          {...form.register("name")}
          label={t("folderName.label")}
          autoComplete="off"
          error={validationError ?? props.failureMessage}
        />
        <DialogFooter>
          <DialogClose
            render={
              <Button type="button" variant="outline" disabled={isSubmitting} />
            }
          >
            {t("folderName.cancel")}
          </DialogClose>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? props.submittingLabel : props.submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

/**
 * 新建与重命名文件夹共用的名称对话框, 挂载即打开, 关闭即卸载: 一个名称输入框与取消, 提交按钮,
 * 提交进行中不响应关闭.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function FolderNameDialog(
  props: FolderNameDialogProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { initialName, onClose, ...bodyProps } = props;
  const schema = useMemo(() => createFolderNameSchema(), []);
  const form = useForm<FolderNameFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: initialName },
  });
  const { isSubmitting } = form.formState;
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !isSubmitting) {
          onClose();
        }
      }}
    >
      <DialogContent closeLabel={t("common.close")}>
        <FolderNameDialogBody {...bodyProps} form={form} />
      </DialogContent>
    </Dialog>
  );
}
