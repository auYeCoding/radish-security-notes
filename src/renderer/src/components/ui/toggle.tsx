import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";

import { toggleVariants } from "@renderer/components/ui/toggle-variants";

/**
 * 切换按钮, 基于 Base UI 的 Toggle 并套用变体与尺寸样式.
 * @param root0 组件属性, 含 className, variant, size 与切换按钮原生属性.
 * @returns 切换按钮元素.
 */
export function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props &
  VariantProps<typeof toggleVariants>): React.JSX.Element {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}
