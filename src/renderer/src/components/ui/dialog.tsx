import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "cn";

import { Button } from "@renderer/components/ui/button";
import {
  MODAL_POPUP_MOTION,
  OVERLAY_MOTION,
} from "@renderer/components/ui/popup-motion";
import { XIcon } from "lucide-react";

/**
 * 对话框内容面板的关闭按钮属性.
 */
interface DialogContentCloseProps {
  /**
   * 右上角关闭按钮的无障碍名称, 由调用方按当前语言提供.
   */
  closeLabel: string;
  /**
   * 是否显示右上角的关闭按钮, 默认显示.
   */
  showCloseButton?: boolean;
}

/**
 * 对话框的根, 管理开合状态.
 * @param root0 组件属性, 即对话框根的原生属性.
 * @returns 对话框根元素.
 */
function Dialog({ ...props }: DialogPrimitive.Root.Props): React.JSX.Element {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

/**
 * 打开对话框的触发元素.
 * @param root0 组件属性, 即触发器的原生属性.
 * @returns 触发器元素.
 */
function DialogTrigger({
  ...props
}: DialogPrimitive.Trigger.Props): React.JSX.Element {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

/**
 * 把对话框渲染到文档根部的传送门.
 * @param root0 组件属性, 即传送门的原生属性.
 * @returns 传送门元素.
 */
function DialogPortal({
  ...props
}: DialogPrimitive.Portal.Props): React.JSX.Element {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

/**
 * 关闭对话框的元素.
 * @param root0 组件属性, 即关闭器的原生属性.
 * @returns 关闭器元素.
 */
function DialogClose({
  ...props
}: DialogPrimitive.Close.Props): React.JSX.Element {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/**
 * 对话框背后的遮罩.
 * @param root0 组件属性, 含 className 与遮罩原生属性.
 * @returns 遮罩元素.
 */
function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props): React.JSX.Element {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        OVERLAY_MOTION,
        "fixed inset-0 isolate z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 对话框的内容面板, 带遮罩, 进出场样式与右上角关闭按钮.
 * @param root0 组件属性, 含 className, children, closeLabel, showCloseButton 与面板原生属性.
 * @returns 内容面板元素.
 */
function DialogContent({
  className,
  children,
  closeLabel,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & DialogContentCloseProps): React.JSX.Element {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          MODAL_POPUP_MOTION,
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 outline-none sm:max-w-sm",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon-sm"
              />
            }
          >
            <XIcon aria-hidden="true" />
            <span className="sr-only">{closeLabel}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

/**
 * 对话框的头部, 纵向排列标题与说明.
 * @param root0 组件属性, 含 className 与容器原生属性.
 * @returns 头部元素.
 */
function DialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

/**
 * 对话框的底部, 放操作按钮.
 * @param root0 组件属性, 含 className 与容器原生属性.
 * @returns 底部元素.
 */
function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 对话框的标题.
 * @param root0 组件属性, 含 className 与标题原生属性.
 * @returns 标题元素.
 */
function DialogTitle({
  className,
  ...props
}: DialogPrimitive.Title.Props): React.JSX.Element {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-base leading-none font-medium", className)}
      {...props}
    />
  );
}

/**
 * 对话框的说明文字.
 * @param root0 组件属性, 含 className 与说明原生属性.
 * @returns 说明元素.
 */
function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props): React.JSX.Element {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
