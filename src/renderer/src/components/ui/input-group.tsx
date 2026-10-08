import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

import { Button } from "@renderer/components/ui/button";
import { Input } from "@renderer/components/ui/input";
import { FAST_STATE_TRANSITION } from "@renderer/components/ui/state-motion";
import { Textarea } from "@renderer/components/ui/textarea";

/**
 * 输入框组, 把输入框与前后附加元素 (图标, 文字, 按钮) 包在同一个边框里.
 * @param root0 组件属性, 含 className 与容器原生属性.
 * @returns 输入框组元素.
 */
function InputGroup({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        FAST_STATE_TRANSITION,
        "group/input-group relative flex h-8 w-full min-w-0 items-center rounded-lg border border-input outline-none in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-disabled:bg-input/50 has-disabled:opacity-50 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-3 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto dark:bg-input/30 dark:has-disabled:bg-input/80 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 附加元素的对齐位置样式.
 */
const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start":
          "order-first pl-2 has-[>button]:ml-[-0.3rem] has-[>kbd]:ml-[-0.15rem]",
        "inline-end":
          "order-last pr-2 has-[>button]:mr-[-0.3rem] has-[>kbd]:mr-[-0.15rem]",
        "block-start":
          "order-first w-full justify-start px-2.5 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2",
        "block-end":
          "order-last w-full justify-start px-2.5 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  },
);

/**
 * 点击附加元素的空白处时让组内的输入框获得焦点, 点在按钮上则不处理.
 * @param event 附加元素上的点击事件.
 */
function focusInputOnAddonClick(event: React.MouseEvent<HTMLDivElement>): void {
  if (event.target instanceof Element && event.target.closest("button")) {
    return;
  }
  event.currentTarget.parentElement?.querySelector("input")?.focus();
}

/**
 * 输入框组的附加元素, 放图标, 文字或按钮. 它只是装饰容器, 不承担分组语义,
 * 点击空白处把焦点交给输入框, 键盘用户直接 Tab 到输入框.
 * @param root0 组件属性, 含 className, align 与容器原生属性.
 * @returns 附加元素容器.
 */
function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof inputGroupAddonVariants>): React.JSX.Element {
  return (
    <div
      role="presentation"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={focusInputOnAddonClick}
      {...props}
    />
  );
}

/**
 * 输入框组内按钮的尺寸样式.
 */
const inputGroupButtonVariants = cva(
  "flex items-center gap-2 text-sm shadow-none",
  {
    variants: {
      size: {
        xs: "h-6 gap-1 rounded-[calc(var(--radius)-3px)] px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
        sm: "",
        "icon-xs":
          "size-6 rounded-[calc(var(--radius)-3px)] p-0 has-[>svg]:p-0",
        "icon-sm": "size-8 p-0 has-[>svg]:p-0",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  },
);

/**
 * 输入框组内按钮的类型属性, 默认是普通按钮, 避免在表单里意外提交.
 */
interface InputGroupButtonTypeProps {
  /**
   * 按钮的 type 属性.
   */
  type?: "button" | "submit" | "reset";
}

/**
 * 输入框组内的按钮, 默认是幽灵变体与超小尺寸.
 * @param root0 组件属性, 含 className, type, variant, size 与按钮原生属性.
 * @returns 组内按钮元素.
 */
function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size" | "type"> &
  VariantProps<typeof inputGroupButtonVariants> &
  InputGroupButtonTypeProps): React.JSX.Element {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  );
}

/**
 * 输入框组内的文字附加元素.
 * @param root0 组件属性, 含 className 与文字容器原生属性.
 * @returns 文字元素.
 */
function InputGroupText({
  className,
  ...props
}: React.ComponentProps<"span">): React.JSX.Element {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 输入框组内的单行输入框, 去掉自身边框与背景, 由组统一绘制.
 * @param root0 组件属性, 含 className 与输入框原生属性.
 * @returns 组内输入框元素.
 */
function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">): React.JSX.Element {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        "flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 输入框组内的多行输入框, 去掉自身边框与背景, 由组统一绘制.
 * @param root0 组件属性, 含 className 与多行输入框原生属性.
 * @returns 组内多行输入框元素.
 */
function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">): React.JSX.Element {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        "flex-1 resize-none rounded-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
};
