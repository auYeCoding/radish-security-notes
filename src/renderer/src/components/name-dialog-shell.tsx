import type { FormEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";

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
 * 名称对话框外壳的属性.
 */
interface NameDialogShellProps {
  /**
   * 对话框标题.
   */
  readonly title: string;
  /**
   * 标题下的说明.
   */
  readonly description: string;
  /**
   * 取消按钮的文字.
   */
  readonly cancelLabel: string;
  /**
   * 提交按钮的文字.
   */
  readonly submitLabel: string;
  /**
   * 提交执行中提交按钮的文字.
   */
  readonly submittingLabel: string;
  /**
   * 提交是否正在执行, 执行中两个按钮都禁用且对话框不响应关闭.
   */
  readonly isSubmitting: boolean;
  /**
   * 表单提交时的回调, 由调用方的表单库处理校验.
   */
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /**
   * 对话框要关闭时的回调, 取消, 按 Esc, 点遮罩或点关闭按钮之后调用.
   */
  readonly onClose: () => void;
  /**
   * 表单里的字段, 例如名称输入框.
   */
  readonly children: ReactNode;
}

/**
 * 新建与编辑名称类对象 (文件夹, 标签) 共用的对话框外壳, 挂载即打开, 关闭即卸载: 标题与说明,
 * 调用方给出的字段, 取消与提交按钮. 提交进行中不响应关闭.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function NameDialogShell(
  props: NameDialogShellProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { isSubmitting, onClose } = props;
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
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={props.onSubmit}
        >
          {props.children}
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                />
              }
            >
              {props.cancelLabel}
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? props.submittingLabel : props.submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
