import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { cn } from "cn";

import { Button } from "@renderer/components/ui/button";
import {
  MODAL_POPUP_MOTION,
  OVERLAY_MOTION,
} from "@renderer/components/ui/popup-motion";

/**
 * 确认对话框内容的尺寸属性.
 */
interface AlertDialogContentSizeProps {
  /**
   * 对话框的宽度档位, 默认是 default.
   */
  size?: "default" | "sm";
}

/**
 * 确认对话框的根, 管理开合状态. 与普通对话框不同, 点击遮罩不会关闭.
 * @param root0 组件属性, 即对话框根的原生属性.
 * @returns 对话框根元素.
 */
function AlertDialog({
  ...props
}: AlertDialogPrimitive.Root.Props): React.JSX.Element {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

/**
 * 打开确认对话框的触发元素.
 * @param root0 组件属性, 即触发器的原生属性.
 * @returns 触发器元素.
 */
function AlertDialogTrigger({
  ...props
}: AlertDialogPrimitive.Trigger.Props): React.JSX.Element {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  );
}

/**
 * 把对话框渲染到文档根部的传送门.
 * @param root0 组件属性, 即传送门的原生属性.
 * @returns 传送门元素.
 */
function AlertDialogPortal({
  ...props
}: AlertDialogPrimitive.Portal.Props): React.JSX.Element {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  );
}

/**
 * 对话框背后的遮罩.
 * @param root0 组件属性, 含 className 与遮罩原生属性.
 * @returns 遮罩元素.
 */
function AlertDialogOverlay({
  className,
  ...props
}: AlertDialogPrimitive.Backdrop.Props): React.JSX.Element {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
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
 * 对话框的内容面板, 带遮罩与进出场样式.
 * @param root0 组件属性, 含 className, size 与面板原生属性.
 * @returns 内容面板元素.
 */
function AlertDialogContent({
  className,
  size = "default",
  ...props
}: AlertDialogPrimitive.Popup.Props &
  AlertDialogContentSizeProps): React.JSX.Element {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn(
          MODAL_POPUP_MOTION,
          "group/alert-dialog-content fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-popover-foreground ring-1 ring-foreground/10 outline-none data-[size=default]:max-w-xs data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-sm",
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

/**
 * 对话框头部, 放标题与说明.
 * @param root0 组件属性, 含 className 与容器原生属性.
 * @returns 头部元素.
 */
function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        "grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-4 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 对话框底部, 放取消与确认按钮.
 * @param root0 组件属性, 含 className 与容器原生属性.
 * @returns 底部元素.
 */
function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 对话框头部的图标区.
 * @param root0 组件属性, 含 className 与容器原生属性.
 * @returns 图标区元素.
 */
function AlertDialogMedia({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn(
        "mb-2 inline-flex size-10 items-center justify-center rounded-md bg-muted sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-6",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 对话框标题.
 * @param root0 组件属性, 含 className 与标题原生属性.
 * @returns 标题元素.
 */
function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>): React.JSX.Element {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn(
        "text-base font-medium sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 对话框说明文字.
 * @param root0 组件属性, 含 className 与说明原生属性.
 * @returns 说明元素.
 */
function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<
  typeof AlertDialogPrimitive.Description
>): React.JSX.Element {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn(
        "text-sm text-balance text-muted-foreground md:text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 对话框的确认按钮. 它只是普通按钮, 点击后是否关闭由使用方控制.
 * @param root0 组件属性, 含 className 与按钮属性.
 * @returns 确认按钮元素.
 */
function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof Button>): React.JSX.Element {
  return (
    <Button
      data-slot="alert-dialog-action"
      className={cn(className)}
      {...props}
    />
  );
}

/**
 * 对话框的取消按钮, 点击后关闭对话框.
 * @param root0 组件属性, 含 className, variant, size 与关闭按钮原生属性.
 * @returns 取消按钮元素.
 */
function AlertDialogCancel({
  className,
  variant = "outline",
  size = "default",
  ...props
}: AlertDialogPrimitive.Close.Props &
  Pick<
    React.ComponentProps<typeof Button>,
    "variant" | "size"
  >): React.JSX.Element {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      className={cn(className)}
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
