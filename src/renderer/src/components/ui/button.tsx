import { Button as ButtonPrimitive } from "@base-ui/react/button";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";

import { buttonVariants } from "@renderer/components/ui/button-variants";

/**
 * 按钮组件, 基于 Base UI 的按钮并套用变体与尺寸样式.
 * @param root0 组件属性, 含 className, variant, size 与按钮原生属性.
 * @returns 按钮元素.
 */
export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants>): React.JSX.Element {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
