import * as React from "react";
import { cn } from "cn";

/**
 * 卡片的尺寸属性.
 */
interface CardSizeProps {
  /**
   * 卡片的内边距尺寸, 默认是 default.
   */
  size?: "default" | "sm";
}

/**
 * 卡片容器, 用 1px 环形边框而不是阴影区分层级.
 * @param root0 组件属性, 含 className, size 与容器原生属性.
 * @returns 卡片元素.
 */
function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & CardSizeProps): React.JSX.Element {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 卡片头部, 放标题, 说明与右上角操作.
 * @param root0 组件属性, 含 className 与容器原生属性.
 * @returns 头部元素.
 */
function CardHeader({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 卡片标题.
 * @param root0 组件属性, 含 className 与容器原生属性.
 * @returns 标题元素.
 */
function CardTitle({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 卡片说明文字.
 * @param root0 组件属性, 含 className 与容器原生属性.
 * @returns 说明元素.
 */
function CardDescription({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

/**
 * 卡片头部右上角的操作区.
 * @param root0 组件属性, 含 className 与容器原生属性.
 * @returns 操作区元素.
 */
function CardAction({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 卡片正文.
 * @param root0 组件属性, 含 className 与容器原生属性.
 * @returns 正文元素.
 */
function CardContent({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  );
}

/**
 * 卡片底部, 放次要操作.
 * @param root0 组件属性, 含 className 与容器原生属性.
 * @returns 底部元素.
 */
function CardFooter({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-muted/50 p-(--card-spacing)",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
