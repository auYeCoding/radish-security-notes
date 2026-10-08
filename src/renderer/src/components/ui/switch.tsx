import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "cn";

import {
  BASE_STATE_TRANSITION,
  BASE_TRANSFORM_TRANSITION,
} from "@renderer/components/ui/state-motion";

/**
 * 开关的属性: Base UI 开关的原生属性加尺寸.
 */
interface SwitchProps extends SwitchPrimitive.Root.Props {
  /**
   * 开关的尺寸, 默认是 default.
   */
  size?: "sm" | "default";
}

/**
 * 开关, 基于 Base UI 的开关, 打开时用主色填充, 有默认与小两种尺寸.
 * @param root0 组件属性, 含 className, 尺寸与开关原生属性.
 * @returns 开关元素.
 */
function Switch({
  className,
  size = "default",
  ...props
}: SwitchProps): React.JSX.Element {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        BASE_STATE_TRANSITION,
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent outline-none group-has-[:focus-visible]/field-label:border-transparent group-has-[:focus-visible]/field-label:ring-0 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-[18.4px] data-[size=default]:w-[32px] data-[size=sm]:h-[14px] data-[size=sm]:w-[24px] dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:bg-primary data-unchecked:bg-input dark:data-unchecked:bg-input/80 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          BASE_TRANSFORM_TRANSITION,
          "pointer-events-none block rounded-full bg-background ring-0 group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)] dark:data-checked:bg-primary-foreground group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0 dark:data-unchecked:bg-foreground",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
