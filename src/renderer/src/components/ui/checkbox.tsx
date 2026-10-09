import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cn } from "cn";
import { CheckIcon, MinusIcon } from "lucide-react";

import {
  FIELD_LABEL_FOCUS_OUTLINE_RESET,
  FOCUS_OUTLINE,
} from "@renderer/components/ui/focus-outline";
import {
  FAST_STATE_TRANSITION,
  MARK_TRANSITION,
} from "@renderer/components/ui/state-motion";

/**
 * 复选框, 基于 Base UI 的复选框, 选中时用主色填充并显示对勾, 半选 (`indeterminate`) 时用主色填充并
 * 显示横线.
 * @param root0 组件属性, 含 className 与复选框原生属性.
 * @returns 复选框元素.
 */
function Checkbox({
  className,
  ...props
}: CheckboxPrimitive.Root.Props): React.JSX.Element {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        FAST_STATE_TRANSITION,
        FOCUS_OUTLINE,
        FIELD_LABEL_FOCUS_OUTLINE_RESET,
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:aria-checked:border-primary dark:bg-input/30 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground dark:data-checked:bg-primary dark:data-indeterminate:bg-primary",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className={cn(
          MARK_TRANSITION,
          "grid place-content-center text-current [&>svg]:size-3.5",
        )}
      >
        <CheckIcon className="in-data-indeterminate:hidden" />
        <MinusIcon className="hidden in-data-indeterminate:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
