import * as React from "react";
import { cn } from "cn";

import { FAST_STATE_TRANSITION } from "@renderer/components/ui/state-motion";

/**
 * 多行文本输入框, 套用统一样式.
 * @param root0 组件属性, 含 className 与多行输入框原生属性.
 * @returns 多行输入框元素.
 */
function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">): React.JSX.Element {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        FAST_STATE_TRANSITION,
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
